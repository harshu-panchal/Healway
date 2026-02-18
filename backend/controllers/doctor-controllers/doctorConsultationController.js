const asyncHandler = require('../../middleware/asyncHandler');
const Consultation = require('../../models/Consultation');
const Appointment = require('../../models/Appointment');
const Prescription = require('../../models/Prescription');
const { getIO } = require('../../config/socket');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/doctors/consultations
exports.getConsultations = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { status, date } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = { doctorId: id };
  if (status) filter.status = status;
  if (date) {
    const dateObj = new Date(date);
    filter.consultationDate = {
      $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
      $lt: new Date(dateObj.setHours(23, 59, 59, 999)),
    };
  }

  const Patient = require('../../models/Patient');

  const [consultations, total] = await Promise.all([
    Consultation.find(filter)
      .populate({
        path: 'patientId',
        select: 'firstName lastName phone email profileImage dateOfBirth gender',
      })
      .populate('appointmentId', 'appointmentDate time')
      .sort({ consultationDate: -1 })
      .skip(skip)
      .limit(limit),
    Consultation.countDocuments(filter),
  ]);

  // Fetch patient addresses separately to ensure all nested fields are included
  const patientIds = consultations
    .map(c => c.patientId?._id || c.patientId?.id)
    .filter(Boolean);

  const patientsWithAddress = await Patient.find({ _id: { $in: patientIds } })
    .select('_id address');

  const addressMap = new Map();
  patientsWithAddress.forEach(patient => {
    if (patient.address) {
      addressMap.set(patient._id.toString(), patient.address);
    }
  });

  // Attach addresses to consultations
  consultations.forEach(consultation => {
    if (consultation.patientId) {
      const patientId = consultation.patientId._id?.toString() || consultation.patientId.id?.toString();
      if (patientId) {
        // Always set address, even if empty, to ensure the field exists
        const address = addressMap.get(patientId) || {};
        consultation.patientId.address = address;
        // Convert to plain object to ensure address is included in JSON response
        if (consultation.patientId.toObject) {
          const patientObj = consultation.patientId.toObject();
          patientObj.address = address;
          consultation.patientId = patientObj;
        }
      }
    }
  });

  return res.status(200).json({
    success: true,
    data: {
      items: consultations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// POST /api/doctors/consultations
exports.createConsultation = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { appointmentId, diagnosis, symptoms, vitals, investigations, advice, followUpDate } = req.body;

  if (!appointmentId) {
    return res.status(400).json({
      success: false,
      message: 'Appointment ID is required',
    });
  }

  // Verify appointment belongs to doctor
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  // Check if consultation already exists
  const existingConsultation = await Consultation.findOne({ appointmentId });
  if (existingConsultation) {
    return res.status(400).json({
      success: false,
      message: 'Consultation already exists for this appointment',
    });
  }

  // Transform investigations from frontend format (name) to backend format (testName)
  let transformedInvestigations = [];
  if (investigations && Array.isArray(investigations)) {
    transformedInvestigations = investigations.map(inv => {
      // If investigation has 'name' field, convert it to 'testName'
      if (inv.name && !inv.testName) {
        return {
          testName: inv.name,
          notes: inv.notes || ''
        };
      }
      // If it already has testName, keep it
      return {
        testName: inv.testName || inv.name || 'Investigation',
        notes: inv.notes || ''
      };
    });
  }

  const consultation = await Consultation.create({
    appointmentId,
    patientId: appointment.patientId,
    doctorId: id,
    consultationDate: new Date(),
    status: 'in-progress',
    diagnosis,
    symptoms,
    vitals,
    investigations: transformedInvestigations,
    advice,
    followUpDate: followUpDate ? new Date(followUpDate) : null,
  });

  // DO NOT update appointment status to completed here
  // Appointment will be marked as completed only when doctor clicks "Complete" button in patient tab
  // This allows doctor to add vitals, prescription, and other details before completing

  // Emit real-time event
  try {
    const io = getIO();
    io.to(`patient-${appointment.patientId}`).emit('consultation:created', {
      consultation: await Consultation.findById(consultation._id)
        .populate('doctorId', 'firstName lastName'),
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  // Cache invalidation removed (Redis removed)

  return res.status(201).json({
    success: true,
    message: 'Consultation created successfully',
    data: await Consultation.findById(consultation._id)
      .populate('patientId', 'firstName lastName')
      .populate('appointmentId'),
  });
});

// PATCH /api/doctors/consultations/:id
exports.updateConsultation = asyncHandler(async (req, res) => {
  const { id: doctorId } = req.auth;
  const { id: consultationId } = req.params; // Route parameter is :id, not :consultationId
  const updateData = req.body;

  // Validate consultationId is a valid MongoDB ObjectId
  if (!consultationId || !consultationId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid consultation ID format',
    });
  }

  const consultation = await Consultation.findOne({
    _id: consultationId,
    doctorId: doctorId,
  });

  if (!consultation) {
    return res.status(404).json({
      success: false,
      message: 'Consultation not found',
    });
  }

  // Allow updates to completed consultations (for prescription edits, diagnosis updates, etc.)
  // But prevent updates to cancelled consultations
  if (consultation.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update cancelled consultation',
    });
  }

  // Transform investigations from frontend format (name) to backend format (testName)
  if (updateData.investigations !== undefined) {
    if (Array.isArray(updateData.investigations) && updateData.investigations.length > 0) {
      updateData.investigations = updateData.investigations.map(inv => {
        // If investigation has 'name' field, convert it to 'testName'
        if (inv.name && !inv.testName) {
          return {
            testName: inv.name,
            notes: inv.notes || ''
          };
        }
        // If it already has testName, keep it
        return {
          testName: inv.testName || inv.name || 'Investigation',
          notes: inv.notes || ''
        };
      });
    } else {
      // If empty array or null, set to empty array
      updateData.investigations = [];
    }
  }

  // Ensure diagnosis and symptoms are properly set (even if empty string)
  if (updateData.diagnosis !== undefined) {
    consultation.diagnosis = updateData.diagnosis || '';
  }
  if (updateData.symptoms !== undefined) {
    consultation.symptoms = updateData.symptoms || '';
  }

  Object.assign(consultation, updateData);
  await consultation.save();

  // Debug logging
  console.log('🔍 Updated consultation:', {
    id: consultation._id,
    diagnosis: consultation.diagnosis,
    symptoms: consultation.symptoms,
    investigationsCount: consultation.investigations?.length || 0,
    investigations: consultation.investigations
  });

  // Emit real-time event
  try {
    const io = getIO();
    io.to(`patient-${consultation.patientId}`).emit('consultation:updated', {
      consultation: await Consultation.findById(consultation._id),
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  // Cache invalidation removed (Redis removed)

  return res.status(200).json({
    success: true,
    message: 'Consultation updated successfully',
    data: consultation,
  });
});

// GET /api/doctors/consultations/:id
exports.getConsultationById = asyncHandler(async (req, res) => {
  const { id: doctorId } = req.auth;
  const { id: consultationId } = req.params; // Route parameter is :id, not :consultationId

  const Patient = require('../../models/Patient');

  // Validate consultationId is a valid MongoDB ObjectId
  if (!consultationId || !consultationId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid consultation ID format',
    });
  }

  const consultation = await Consultation.findOne({
    _id: consultationId,
    doctorId: doctorId,
  })
    .populate({
      path: 'patientId',
      select: 'firstName lastName phone email profileImage dateOfBirth gender bloodGroup',
    })
    .populate('appointmentId', 'appointmentDate time reason')
    .populate('prescriptionId');

  if (!consultation) {
    return res.status(404).json({
      success: false,
      message: 'Consultation not found',
    });
  }

  // Fetch patient address separately to ensure all nested fields are included
  if (consultation.patientId) {
    const patientId = consultation.patientId._id || consultation.patientId.id;
    const fullPatient = await Patient.findById(patientId).select('address');
    if (fullPatient) {
      // Always set address, even if empty, to ensure the field exists
      consultation.patientId.address = fullPatient.address || {};
      // Mark the address field as modified so Mongoose includes it in toObject()
      if (consultation.patientId.markModified) {
        consultation.patientId.markModified('address');
      }
    }
  }

  // Convert to plain object and ensure address is included
  const consultationData = consultation.toObject();
  // Ensure patient address is in the response
  if (consultationData.patientId && consultation.patientId.address) {
    consultationData.patientId.address = consultation.patientId.address;
  }

  return res.status(200).json({
    success: true,
    data: consultationData,
  });
});

// GET /api/doctors/all-consultations
exports.getAllConsultations = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { page, limit, skip } = buildPagination(req);

  const Patient = require('../../models/Patient');

  const [consultations, total] = await Promise.all([
    Consultation.find({ doctorId: id })
      .populate({
        path: 'patientId',
        select: 'firstName lastName phone email profileImage dateOfBirth gender',
      })
      .populate('appointmentId', 'appointmentDate time')
      .sort({ consultationDate: -1 })
      .skip(skip)
      .limit(limit),
    Consultation.countDocuments({ doctorId: id }),
  ]);

  // Fetch patient addresses separately to ensure all nested fields are included
  const patientIds = consultations
    .map(c => c.patientId?._id || c.patientId?.id)
    .filter(Boolean);

  const patientsWithAddress = await Patient.find({ _id: { $in: patientIds } })
    .select('_id address');

  const addressMap = new Map();
  patientsWithAddress.forEach(patient => {
    if (patient.address) {
      addressMap.set(patient._id.toString(), patient.address);
    }
  });

  // Attach addresses to consultations
  consultations.forEach(consultation => {
    if (consultation.patientId) {
      const patientId = consultation.patientId._id?.toString() || consultation.patientId.id?.toString();
      if (patientId) {
        // Always set address, even if empty, to ensure the field exists
        const address = addressMap.get(patientId) || {};
        consultation.patientId.address = address;
        // Convert to plain object to ensure address is included in JSON response
        if (consultation.patientId.toObject) {
          const patientObj = consultation.patientId.toObject();
          patientObj.address = address;
          consultation.patientId = patientObj;
        }
      }
    }
  });

  return res.status(200).json({
    success: true,
    data: {
      items: consultations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

