const asyncHandler = require('../../middleware/asyncHandler');
const Prescription = require('../../models/Prescription');
const Consultation = require('../../models/Consultation');
const { generatePrescriptionPDF, uploadPrescriptionPDF } = require('../../services/pdfService');
const Doctor = require('../../models/Doctor');
const Patient = require('../../models/Patient');
const { getIO } = require('../../config/socket');
const { sendPrescriptionEmail } = require('../../services/notificationService');
const { ROLES } = require('../../utils/constants');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// POST /api/doctors/prescriptions
exports.createPrescription = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { consultationId, notes, expiryDate } = req.body;

  if (!consultationId) {
    return res.status(400).json({
      success: false,
      message: 'Consultation ID is required',
    });
  }

  // Validate consultationId is a valid MongoDB ObjectId
  if (!consultationId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid consultation ID format. Consultation must be created first.',
    });
  }

  // Verify consultation belongs to doctor
  // Fetch consultation as Mongoose document first (needed for save operations)
  const consultationDoc = await Consultation.findOne({
    _id: consultationId,
    doctorId: id,
  }).populate('patientId').populate('doctorId');

  if (!consultationDoc) {
    return res.status(404).json({
      success: false,
      message: 'Consultation not found. Please ensure consultation is created before saving prescription.',
    });
  }

  // Convert to plain object for data extraction (ensures all nested fields are accessible)
  const consultationObj = consultationDoc.toObject ? consultationDoc.toObject() : consultationDoc;

  // Check if prescription already exists
  const existingPrescription = await Prescription.findOne({ consultationId });
  if (existingPrescription) {
    return res.status(400).json({
      success: false,
      message: 'Prescription already exists for this consultation',
    });
  }

  // Get doctor data for PDF
  const doctor = await Doctor.findById(id);
  const patientId = consultationObj.patientId?._id || consultationObj.patientId || consultationDoc?.patientId;
  const patient = await Patient.findById(patientId);

  const diagnosis = consultationObj.diagnosis || '';
  const symptoms = consultationObj.symptoms || '';

  // Transform investigations from backend format (testName) to frontend format (name) for PDF
  let investigations = [];
  if (consultationObj.investigations && Array.isArray(consultationObj.investigations) && consultationObj.investigations.length > 0) {
    investigations = consultationObj.investigations.map(inv => {
      // Handle both Mongoose document and plain object
      const invObj = inv.toObject ? inv.toObject() : (typeof inv === 'object' ? inv : {});
      return {
        name: invObj.testName || invObj.name || 'Investigation',
        testName: invObj.testName || invObj.name || 'Investigation',
        notes: invObj.notes || ''
      };
    });
  }

  // Debug logging
  console.log('🔍 Consultation ID:', consultationId);
  console.log('🔍 Consultation investigations (raw):', JSON.stringify(consultationObj.investigations, null, 2));
  console.log('🔍 Transformed investigations for PDF:', JSON.stringify(investigations, null, 2));
  console.log('🔍 Diagnosis:', diagnosis);
  console.log('🔍 Symptoms:', symptoms);

  const advice = consultationObj.advice || notes || '';

  // Create prescription
  const prescriptionData = {
    consultationId,
    patientId: consultationObj.patientId?._id || consultationObj.patientId || consultationDoc?.patientId,
    doctorId: id,
    notes: advice,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    status: 'active',
  };

  const prescription = await Prescription.create(prescriptionData);

  // Generate and upload PDF with all consultation data
  try {
    // Ensure investigations is an array
    const investigationsArray = Array.isArray(investigations) ? investigations : (investigations ? [investigations] : []);

    const pdfBuffer = await generatePrescriptionPDF(
      {
        ...prescriptionData,
        createdAt: prescription.createdAt,
        diagnosis: diagnosis,
        symptoms: symptoms,
        investigations: investigationsArray, // Ensure it's an array
        advice: advice,
        followUpDate: consultationObj.followUpDate || expiryDate,
        consultationId: consultationObj // Pass full consultation object for fallback
      },
      doctor.toObject(),
      patient.toObject()
    );
    const pdfUrl = await uploadPrescriptionPDF(pdfBuffer, 'healway/prescriptions', `prescription_${prescription._id}`);
    prescription.pdfFileUrl = pdfUrl;
    await prescription.save();
  } catch (error) {
    console.error('PDF generation error:', error);
    // Continue even if PDF generation fails
  }

  // Update consultation with prescription ID
  // IMPORTANT: Do NOT change consultation status to 'completed' here
  // Status should only change when doctor explicitly clicks "Complete" button in patient tab
  if (consultationDoc) {
    consultationDoc.prescriptionId = prescription._id;
    // Keep existing status - don't change to 'completed'
    // consultationDoc.status = 'completed'; // REMOVED - status should only change via Complete button
    await consultationDoc.save();

    // Cache invalidation removed (Redis removed)
  }

  // Emit real-time event
  try {
    const io = getIO();
    io.to(`patient-${consultation.patientId}`).emit('prescription:created', {
      prescription: await Prescription.findById(prescription._id)
        .populate('doctorId', 'firstName lastName'),
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  // Send prescription email to patient
  try {
    const doctorName = doctor.firstName
      ? `Dr. ${doctor.firstName} ${doctor.lastName || ''}`.trim()
      : 'Doctor';
    const patientName = patient.firstName
      ? `${patient.firstName} ${patient.lastName || ''}`.trim()
      : 'Patient';

    await sendPrescriptionEmail({
      patientEmail: patient.email,
      patientName,
      doctorName,
      prescriptionId: prescription._id,
      pdfPath: prescription.pdfFileUrl ? null : null, // PDF is in cloud, not local path
      prescriptionDate: prescription.createdAt,
    }).catch((error) => console.error('Error sending prescription email:', error));
  } catch (error) {
    console.error('Error sending email notifications:', error);
  }

  // Create in-app notifications
  try {
    const { createPrescriptionNotification } = require('../../services/notificationService');
    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate('doctorId', 'firstName lastName')
      .populate('patientId', 'firstName lastName');

    // Notify patient
    await createPrescriptionNotification({
      userId: consultation.patientId,
      userType: 'patient',
      prescription: populatedPrescription,
      doctor: populatedPrescription.doctorId,
      patient: populatedPrescription.patientId,
    }).catch((error) => console.error('Error creating patient prescription notification:', error));
  } catch (error) {
    console.error('Error creating notifications:', error);
  }


  return res.status(201).json({
    success: true,
    message: 'Prescription created successfully',
    data: await Prescription.findById(prescription._id)
      .populate('patientId', 'firstName lastName phone email profileImage dateOfBirth gender address')
      .populate('consultationId', 'diagnosis symptoms investigations advice followUpDate consultationDate'),
  });
});

// PUT /api/doctors/prescriptions/:id
exports.updatePrescription = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { prescriptionId } = req.params; // Note: route uses :id, so this might be req.params.id
  const { notes, expiryDate } = req.body;

  // Use req.params.id as per standard express routing if not explicitly named differently in route
  const targetId = req.params.id || prescriptionId;

  let prescription = await Prescription.findOne({
    _id: targetId,
    doctorId: id,
  });

  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found',
    });
  }

  // Update fields
  if (notes !== undefined) prescription.notes = notes;
  if (expiryDate) prescription.expiryDate = new Date(expiryDate);

  await prescription.save();

  // Fetch fully populated data for PDF generation
  // We need specific fields from consultation for the PDF
  const populatedPrescription = await Prescription.findById(prescription._id)
    .populate({
      path: 'consultationId',
      populate: { path: 'patientId' } // Deep populate if needed, though usually patientId is on prescription too
    })
    .populate('patientId')
    .populate('doctorId');

  const consultationObj = populatedPrescription.consultationId;
  const doctor = await Doctor.findById(id);
  const patient = populatedPrescription.patientId;

  if (consultationObj && doctor && patient) {
    // Re-prepare data for PDF
    const diagnosis = consultationObj.diagnosis || '';
    const symptoms = consultationObj.symptoms || '';
    const advice = prescription.notes || consultationObj.advice || ''; // specific notes override advice if present or exist alongside? In create it was `advice || notes`. Let's stick to what's in database: `prescription.notes`

    // Transform investigations from consultation
    let investigations = [];
    if (consultationObj.investigations && Array.isArray(consultationObj.investigations) && consultationObj.investigations.length > 0) {
      investigations = consultationObj.investigations.map(inv => {
        const invObj = inv.toObject ? inv.toObject() : (typeof inv === 'object' ? inv : {});
        return {
          name: invObj.testName || invObj.name || 'Investigation',
          testName: invObj.testName || invObj.name || 'Investigation',
          notes: invObj.notes || ''
        };
      });
    }

    try {
      const investigationsArray = Array.isArray(investigations) ? investigations : (investigations ? [investigations] : []);

      const pdfBuffer = await generatePrescriptionPDF(
        {
          ...prescription.toObject(),
          createdAt: prescription.createdAt,
          diagnosis: diagnosis,
          symptoms: symptoms,
          investigations: investigationsArray,
          advice: advice,
          followUpDate: consultationObj.followUpDate || prescription.expiryDate,
          consultationId: consultationObj // Pass full object for fallback
        },
        doctor.toObject(),
        patient.toObject()
      );

      const pdfUrl = await uploadPrescriptionPDF(pdfBuffer, 'healway/prescriptions', `prescription_${prescription._id}_v${Date.now()}`);
      prescription.pdfFileUrl = pdfUrl;
      await prescription.save();

    } catch (error) {
      console.error('PDF regeneration error:', error);
      // We don't fail the request if PDF fails, but we log it
    }
  }

  // Emit real-time event
  try {
    const io = getIO();
    // Assuming patientId matches the one in consultation/prescription
    const patientIdForCache = prescription.patientId?._id || prescription.patientId;

    // Cache invalidation removed (Redis removed)

    io.to(`patient-${patientIdForCache}`).emit('prescription:updated', {
      prescription: await Prescription.findById(prescription._id)
        .populate('doctorId', 'firstName lastName'),
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  return res.status(200).json({
    success: true,
    message: 'Prescription updated successfully',
    data: await Prescription.findById(prescription._id)
      .populate('patientId', 'firstName lastName phone email profileImage dateOfBirth gender address')
      .populate('consultationId', 'diagnosis symptoms investigations advice followUpDate consultationDate'),
  });
});

// GET /api/doctors/prescriptions
exports.getPrescriptions = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { status } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = { doctorId: id };
  if (status) filter.status = status;

  const [prescriptions, total] = await Promise.all([
    Prescription.find(filter)
      .populate('patientId', 'firstName lastName phone profileImage')
      .populate('consultationId', 'consultationDate diagnosis symptoms investigations advice followUpDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Prescription.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/doctors/prescriptions/:id
exports.getPrescriptionById = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { prescriptionId } = req.params;

  const prescription = await Prescription.findOne({
    _id: prescriptionId,
    doctorId: id,
  })
    .populate('patientId', 'firstName lastName phone profileImage dateOfBirth')
    .populate('consultationId', 'consultationDate diagnosis vitals')
    .populate('doctorId', 'firstName lastName specialization licenseNumber');

  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: prescription,
  });
});

