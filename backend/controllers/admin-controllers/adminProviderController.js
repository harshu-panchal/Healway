const asyncHandler = require('../../middleware/asyncHandler');
const { ROLES, APPROVAL_STATUS, DOCTOR_ACCESS_MODES } = require('../../utils/constants');
const Doctor = require('../../models/Doctor');
const { cloudinaryUpload } = require('../../services/fileUploadService');

const { sendRoleApprovalEmail } = require('../../services/emailService');

const parseName = ({ firstName, lastName, name }) => {
  if (firstName) {
    return {
      firstName: String(firstName).trim(),
      lastName: lastName ? String(lastName).trim() : '',
    };
  }

  if (name) {
    const parts = String(name).trim().split(/\s+/);
    return {
      firstName: parts.shift(),
      lastName: parts.join(' '),
    };
  }

  return { firstName: undefined, lastName: undefined };
};

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const hasCompleteEducation = (education = []) =>
  Array.isArray(education) &&
  education.some((item) => isNonEmptyString(item?.institution) && isNonEmptyString(item?.degree) && item?.year);

const getDoctorApprovalMissingFields = (doctor) => {
  const missing = [];
  const address = doctor?.clinicDetails?.address || {};

  if (!isNonEmptyString(doctor?.firstName)) missing.push('firstName');
  if (!isNonEmptyString(doctor?.lastName)) missing.push('lastName');
  if (!isNonEmptyString(doctor?.email)) missing.push('email');
  if (!isNonEmptyString(doctor?.phone)) missing.push('phone');
  if (!isNonEmptyString(doctor?.gender)) missing.push('gender');
  if (!isNonEmptyString(doctor?.specialization)) missing.push('specialization');
  if (!isNonEmptyString(doctor?.licenseNumber)) missing.push('licenseNumber');
  if (toOptionalNumber(doctor?.experienceYears) === undefined) missing.push('experienceYears');
  if (!isNonEmptyString(doctor?.qualification)) missing.push('qualification');
  if (!isNonEmptyString(doctor?.bio)) missing.push('bio');
  const hasFee = toOptionalNumber(doctor?.consultationFee) !== undefined || 
                 toOptionalNumber(doctor?.fees?.inPerson?.original) !== undefined || 
                 toOptionalNumber(doctor?.fees?.voiceCall?.original) !== undefined || 
                 toOptionalNumber(doctor?.fees?.videoCall?.original) !== undefined;
  if (!hasFee) missing.push('consultationFee');
  if (!Array.isArray(doctor?.languages) || doctor.languages.length === 0) missing.push('languages');
  if (!Array.isArray(doctor?.services) || doctor.services.length === 0) missing.push('services');
  if (!Array.isArray(doctor?.consultationModes) || doctor.consultationModes.length === 0) missing.push('consultationModes');
  if (!hasCompleteEducation(doctor?.education)) missing.push('education');
  if (!isNonEmptyString(doctor?.clinicDetails?.name)) missing.push('clinicName');
  if (!isNonEmptyString(address?.line1)) missing.push('clinicAddress.line1');
  if (!isNonEmptyString(address?.city)) missing.push('clinicAddress.city');
  if (!isNonEmptyString(address?.state)) missing.push('clinicAddress.state');
  if (!isNonEmptyString(address?.postalCode)) missing.push('clinicAddress.postalCode');
  if (!isNonEmptyString(address?.country)) missing.push('clinicAddress.country');
  if (!Array.isArray(doctor?.documents) || doctor.documents.length === 0) missing.push('documents');
  if (!Array.isArray(doctor?.clinicDetails?.images) || doctor.clinicDetails.images.length === 0) missing.push('clinicImages');

  return missing;
};

const processDocumentInputs = async (documents = []) => {
  if (!Array.isArray(documents) || documents.length === 0) return [];

  const processedDocuments = [];

  for (const doc of documents) {
    if (doc?.fileUrl && doc?.name) {
      processedDocuments.push({
        name: doc.name,
        fileUrl: doc.fileUrl,
        uploadedAt: doc.uploadedAt || new Date(),
      });
      continue;
    }

    if (doc?.data && doc?.name) {
      const base64Data = doc.data.includes(',') ? doc.data.split(',')[1] : doc.data;
      const buffer = Buffer.from(base64Data, 'base64');
      const uploadResult = await cloudinaryUpload(buffer, 'healway/documents', { resource_type: 'raw' });

      processedDocuments.push({
        name: doc.name,
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        uploadedAt: new Date(),
      });
    }
  }

  return processedDocuments;
};

const processClinicImageInputs = async (clinicImages = []) => {
  if (!Array.isArray(clinicImages) || clinicImages.length === 0) return [];

  const processedImages = [];

  for (const img of clinicImages.slice(0, 5)) {
    if (img?.url && img?.publicId) {
      processedImages.push({
        url: img.url,
        publicId: img.publicId,
        uploadedAt: img.uploadedAt || new Date(),
      });
      continue;
    }

    if (img?.data) {
      const base64Data = img.data.includes(',') ? img.data.split(',')[1] : img.data;
      const buffer = Buffer.from(base64Data, 'base64');
      const uploadResult = await cloudinaryUpload(buffer, 'healway/clinics');

      processedImages.push({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        uploadedAt: new Date(),
      });
    }
  }

  return processedImages;
};

/**
 * Helper to build basic pagination options
 */
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 1000);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build common search filter for name / email / phone fields
 */
const buildSearchFilter = (search, fields = []) => {
  if (!search || !search.trim() || !fields.length) return {};

  const regex = new RegExp(search.trim(), 'i');

  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
};

// ────────────────────────────────────────────────────────────────
// DOCTORS
// ────────────────────────────────────────────────────────────────

// GET /api/admin/doctors
exports.getDoctors = asyncHandler(async (req, res) => {
  const { status, specialty, sortBy, sortOrder } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = {};

  if (status && Object.values(APPROVAL_STATUS).includes(status)) {
    filter.status = status;
  }

  if (specialty && specialty.trim()) {
    filter.specialization = new RegExp(specialty.trim(), 'i');
  }

  const searchFilter = buildSearchFilter(req.query.search, [
    'firstName',
    'lastName',
    'email',
    'phone',
    'licenseNumber',
    'specialization',
  ]);

  const finalFilter = Object.keys(searchFilter).length
    ? { $and: [filter, searchFilter] }
    : filter;

  const sort = {};
  if (sortBy) {
    const normalizedSortOrder = sortOrder === 'asc' ? 1 : -1;
    sort[sortBy] = normalizedSortOrder;
  } else {
    // Default sort: sortOrder (asc) then createdAt (desc)
    sort.sortOrder = 1;
    sort.createdAt = -1;
  }

  const [items, total] = await Promise.all([
    Doctor.find(finalFilter).sort(sort).skip(skip).limit(limit),
    Doctor.countDocuments(finalFilter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// POST /api/admin/doctors
exports.createDoctor = asyncHandler(async (req, res) => {
  const adminId = req.auth?.id;
  const {
    name,
    firstName,
    lastName,
    email,
    phone,
    gender,
    specialization,
    licenseNumber,
    experienceYears,
    education,
    qualification,
    bio,
    languages,
    services,
    consultationModes,
    clinicName,
    clinicAddress,
    clinicDetails,
    documents,
    clinicImages,
    consultationFee,
    original_fees,
    discount_amount,
    fees,
    isDoctor = true,
  } = req.body;

  const resolvedName = parseName({ name, firstName, lastName });
  const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
  const normalizedPhone = phone ? String(phone).trim() : '';
  const normalizedLicense = licenseNumber ? String(licenseNumber).trim() : '';

  if (
    !resolvedName.firstName ||
    !normalizedEmail ||
    !normalizedPhone ||
    !gender ||
    !specialization ||
    !normalizedLicense
  ) {
    return res.status(400).json({
      success: false,
      message: 'Required fields missing. Provide first name, email, phone, gender, specialization, and license number.',
    });
  }

  const [existingEmail, existingPhone, existingLicense] = await Promise.all([
    Doctor.findOne({ email: normalizedEmail }),
    Doctor.findOne({ phone: normalizedPhone }),
    Doctor.findOne({ licenseNumber: normalizedLicense }),
  ]);

  if (existingEmail) {
    return res.status(400).json({ success: false, message: 'Email already registered.' });
  }

  if (existingPhone) {
    return res.status(400).json({ success: false, message: 'Phone number already registered.' });
  }

  if (existingLicense) {
    return res.status(400).json({ success: false, message: 'License number already registered.' });
  }

  const clinicPayload = clinicDetails ? { ...clinicDetails } : {};
  if (clinicName) clinicPayload.name = String(clinicName).trim();
  if (clinicAddress) clinicPayload.address = clinicAddress;
  const processedDocuments = await processDocumentInputs(documents);
  const processedClinicImages = await processClinicImageInputs(clinicImages);
  if (processedClinicImages.length > 0) clinicPayload.images = processedClinicImages;

  const originalFee = toOptionalNumber(original_fees);
  const discountAmount = toOptionalNumber(discount_amount) || 0;
  const finalFee = toOptionalNumber(consultationFee);
  const inPersonOriginal = originalFee ?? finalFee ?? 0;
  const inPersonFinal = Math.max(0, finalFee ?? (inPersonOriginal - discountAmount));

  const doctor = await Doctor.create({
    firstName: resolvedName.firstName,
    lastName: resolvedName.lastName || '',
    email: normalizedEmail,
    phone: normalizedPhone,
    gender,
    specialization: String(specialization).trim(),
    licenseNumber: normalizedLicense,
    experienceYears: toOptionalNumber(experienceYears),
    education: Array.isArray(education) ? education.filter((item) => item?.institution || item?.degree || item?.year) : [],
    qualification: qualification || undefined,
    bio: bio || undefined,
    languages: Array.isArray(languages) ? languages.filter(Boolean) : [],
    services: Array.isArray(services) ? services.filter(Boolean) : [],
    consultationModes: Array.isArray(consultationModes) ? consultationModes.filter(Boolean) : [],
    clinicDetails: Object.keys(clinicPayload).length ? clinicPayload : undefined,
    documents: processedDocuments,
    original_fees: inPersonOriginal,
    discount_amount: discountAmount,
    consultationFee: inPersonFinal,
    fees: {
      inPerson: {
        original: fees?.inPerson?.original ?? inPersonOriginal,
        discount: fees?.inPerson?.discount ?? discountAmount,
        final: fees?.inPerson?.final ?? inPersonFinal,
      },
      videoCall: {
        original: fees?.videoCall?.original ?? 0,
        discount: fees?.videoCall?.discount ?? 0,
        final: fees?.videoCall?.final ?? 0,
      },
      voiceCall: {
        original: fees?.voiceCall?.original ?? 0,
        discount: fees?.voiceCall?.discount ?? 0,
        final: fees?.voiceCall?.final ?? 0,
      },
      homeVisit: {
        original: fees?.homeVisit?.original ?? 0,
        discount: fees?.homeVisit?.discount ?? 0,
        final: fees?.homeVisit?.final ?? 0,
      },
    },
    isDoctor: Boolean(isDoctor),
    status: APPROVAL_STATUS.APPROVED,
    isActive: true,
    approvedAt: new Date(),
    approvedBy: adminId,
  });

  return res.status(201).json({
    success: true,
    message: 'Doctor created and approved successfully.',
    data: doctor,
  });
});

// GET /api/admin/doctors/:id
exports.getDoctorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doctor = await Doctor.findById(id);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found.',
    });
  }

  return res.status(200).json({
    success: true,
    data: doctor,
  });
});

// GET /api/admin/doctors/:id/stats
exports.getDoctorStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { filter = 'all' } = req.query; // 'all' or 'today'

  const doctor = await Doctor.findById(id);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found.',
    });
  }

  const Appointment = require('../../models/Appointment');
  const Patient = require('../../models/Patient');

  // Build date filter for 'today'
  let dateFilter = {};
  if (filter === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    dateFilter = {
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };
  }

  // Get total appointments count
  const appointmentsFilter = { doctorId: id, ...dateFilter };
  const totalAppointments = await Appointment.countDocuments(appointmentsFilter);

  // Get unique patients count
  const uniquePatientIds = await Appointment.distinct('patientId', appointmentsFilter);
  const totalPatients = uniquePatientIds.length;

  // Get appointments by status (for additional insights)
  const appointmentsByStatus = await Appointment.aggregate([
    { $match: appointmentsFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const statusBreakdown = {};
  appointmentsByStatus.forEach(item => {
    statusBreakdown[item._id] = item.count;
  });

  // Get detailed patient list with their appointments
  const patientsWithAppointments = [];

  for (const patientId of uniquePatientIds) {
    try {
      // Get patient details
      const patient = await Patient.findById(patientId).select('-password').lean();

      if (patient) {
        // Get all appointments for this patient with this doctor
        const patientAppointments = await Appointment.find({
          doctorId: id,
          patientId: patientId,
          ...dateFilter
        })
          .sort({ appointmentDate: -1 })
          .lean();

        patientsWithAppointments.push({
          patientId: patient._id,
          patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'N/A',
          email: patient.email || 'N/A',
          phone: patient.phone || 'N/A',
          gender: patient.gender || 'N/A',
          dateOfBirth: patient.dateOfBirth || null,
          bloodGroup: patient.bloodGroup || 'N/A',
          totalAppointments: patientAppointments.length,
          appointments: patientAppointments.map(apt => ({
            appointmentId: apt._id,
            appointmentDate: apt.appointmentDate,
            timeSlot: apt.timeSlot,
            status: apt.status,
            consultationType: apt.consultationMode,
            symptoms: apt.symptoms || [],
            diagnosis: apt.diagnosis || '',
            prescription: apt.prescription || [],
            notes: apt.notes || '',
            fee: apt.fee || 0,
            paymentStatus: apt.paymentStatus || 'pending',
            createdAt: apt.createdAt,
            updatedAt: apt.updatedAt
          }))
        });
      }
    } catch (error) {
      console.error(`Error fetching patient ${patientId}:`, error);
      // Continue with next patient even if one fails
    }
  }

  // Sort patients by total appointments (descending)
  patientsWithAppointments.sort((a, b) => b.totalAppointments - a.totalAppointments);

  return res.status(200).json({
    success: true,
    data: {
      doctorId: id,
      doctorName: `${doctor.firstName} ${doctor.lastName || ''}`.trim(),
      followerCount: doctor.followerCount || 0,
      viewCount: doctor.viewCount || 0,
      filter,
      stats: {
        totalPatients,
        totalAppointments,
        statusBreakdown
      },
      patients: patientsWithAppointments
    },
  });
});

// PATCH /api/admin/doctors/:id/verify
exports.verifyDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.auth?.id;

  const doctor = await Doctor.findById(id);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found.',
    });
  }

  const missingFields = getDoctorApprovalMissingFields(doctor);
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Complete all doctor profile fields before approval.',
      data: {
        missingFields,
      },
    });
  }

  doctor.status = APPROVAL_STATUS.APPROVED;
  doctor.rejectionReason = undefined;
  doctor.approvedAt = new Date();
  doctor.approvedBy = adminId;

  await doctor.save();

  // Cache invalidation removed (Redis removed)

  // Get admin details for notifications
  const Admin = require('../../models/Admin');
  const admin = await Admin.findById(adminId).select('name email');

  // Send approval email to doctor with admin details
  if (doctor.email) {
    sendRoleApprovalEmail({
      role: 'doctor',
      email: doctor.email,
      status: APPROVAL_STATUS.APPROVED,
      adminName: admin?.name || 'Admin',
      doctorName: `${doctor.firstName} ${doctor.lastName || ''}`.trim(),
      specialization: doctor.specialization,
      approvedAt: doctor.approvedAt,
    }).catch((error) => {
      console.error('Failed to send approval email to doctor:', error);
      // Don't fail the request if email fails
    });
  }

  // Create in-app notification for doctor
  try {
    const { createNotification } = require('../../services/notificationService');
    const doctorName = `${doctor.firstName} ${doctor.lastName || ''}`.trim();
    const adminName = admin?.name || 'Admin';

    await createNotification({
      userId: id,
      userType: 'doctor',
      type: 'system',
      title: 'Account Approved',
      message: `Your registration has been approved by ${adminName}. You can now sign in and start using the platform.`,
      data: {
        adminId: adminId,
        adminName: adminName,
        approvedAt: doctor.approvedAt,
        specialization: doctor.specialization,
        doctorName: doctorName,
      },
      priority: 'high',
      actionUrl: '/doctor/dashboard',
      icon: 'approval',
      sendEmail: false, // Email already sent above
      emitSocket: true,
    }).catch((error) => {
      console.error('Error creating doctor approval notification:', error);
    });
  } catch (error) {
    console.error('Error creating doctor approval notification:', error);
  }

  return res.status(200).json({
    success: true,
    message: 'Doctor approved successfully.',
    data: doctor,
  });
});

// PATCH /api/admin/doctors/:id/reject
exports.rejectDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.auth?.id;

  const doctor = await Doctor.findById(id);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found.',
    });
  }

  doctor.status = APPROVAL_STATUS.REJECTED;
  const rejectionReason = reason && String(reason).trim()
    ? String(reason).trim()
    : 'Rejected by admin.';
  doctor.rejectionReason = rejectionReason;
  doctor.approvedAt = undefined;
  doctor.approvedBy = adminId;

  await doctor.save();

  // Cache invalidation removed (Redis removed)

  // Send rejection email to doctor
  if (doctor.email) {
    sendRoleApprovalEmail({
      role: 'doctor',
      email: doctor.email,
      status: APPROVAL_STATUS.REJECTED,
      reason: rejectionReason,
    }).catch((error) => {
      console.error('Failed to send rejection email to doctor:', error);
      // Don't fail the request if email fails
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Doctor rejected successfully.',
    data: doctor,
  });
});

// PATCH /api/admin/doctors/:id/toggle-featured
exports.toggleFeatured = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;

  // Use findByIdAndUpdate to avoid triggering full document validation on unrelated fields
  // which might have legacy invalid data (e.g. 'call' instead of 'voice_call' in consultationModes)
  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { $set: { isFeatured } },
    { new: true, runValidators: false }
  );

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found.',
    });
  }

  // Cache invalidation removed (Redis removed)

  return res.status(200).json({
    success: true,
    message: `Doctor ${isFeatured ? 'marked as featured' : 'removed from featured'} successfully.`,
    data: doctor,
  });
});

// PATCH /api/admin/doctors/:id
exports.updateDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    firstName,
    lastName,
    email,
    phone,
    gender,
    specialization,
    licenseNumber,
    experienceYears,
    education,
    qualification,
    bio,
    languages,
    services,
    consultationModes,
    clinicName,
    clinicAddress,
    clinicDetails,
    documents,
    clinicImages,
    consultationFee,
    original_fees,
    discount_amount,
    fees,
    isActive,
    isDoctor,
  } = req.body;

  const doctor = await Doctor.findById(id);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found.',
    });
  }

  const resolvedName = parseName({ name, firstName, lastName });
  if (resolvedName.firstName) doctor.firstName = resolvedName.firstName;
  if (resolvedName.lastName !== undefined) doctor.lastName = resolvedName.lastName;

  if (email) doctor.email = String(email).trim().toLowerCase();
  if (phone) doctor.phone = String(phone).trim();
  if (gender) doctor.gender = gender;
  if (specialization) doctor.specialization = String(specialization).trim();
  if (licenseNumber) doctor.licenseNumber = String(licenseNumber).trim();
  if (experienceYears !== undefined) doctor.experienceYears = toOptionalNumber(experienceYears);
  if (qualification !== undefined) doctor.qualification = qualification;
  if (bio !== undefined) doctor.bio = bio;
  if (isActive !== undefined) doctor.isActive = Boolean(isActive);
  if (isDoctor !== undefined) doctor.isDoctor = Boolean(isDoctor);

  if (Array.isArray(languages)) doctor.languages = languages.filter(Boolean);
  if (Array.isArray(services)) doctor.services = services.filter(Boolean);
  if (Array.isArray(consultationModes)) doctor.consultationModes = consultationModes.filter(Boolean);
  if (Array.isArray(education)) {
    doctor.education = education.filter((item) => item?.institution || item?.degree || item?.year);
  }

  const clinicPayload = clinicDetails ? { ...clinicDetails } : (doctor.clinicDetails || {});
  if (clinicName) clinicPayload.name = String(clinicName).trim();
  if (clinicAddress) clinicPayload.address = clinicAddress;
  if (documents !== undefined) {
    doctor.documents = await processDocumentInputs(documents);
  }
  if (clinicImages !== undefined) {
    clinicPayload.images = await processClinicImageInputs(clinicImages);
  }
  if (Object.keys(clinicPayload).length) doctor.clinicDetails = clinicPayload;

  const originalFee = toOptionalNumber(original_fees);
  const discountAmount = toOptionalNumber(discount_amount);
  const finalFee = toOptionalNumber(consultationFee);

  if (originalFee !== undefined) doctor.original_fees = originalFee;
  if (discountAmount !== undefined) doctor.discount_amount = discountAmount;
  if (finalFee !== undefined) doctor.consultationFee = finalFee;

  // Update nested fees object if needed
  if (fees || originalFee !== undefined || discountAmount !== undefined || finalFee !== undefined) {
    const existingFees = doctor.fees?.toObject ? doctor.fees.toObject() : (doctor.fees || {});
    const existingInPerson = existingFees.inPerson || {};
    const existingVideoCall = existingFees.videoCall || {};
    const existingVoiceCall = existingFees.voiceCall || {};
    const existingHomeVisit = existingFees.homeVisit || {};

    doctor.fees = {
      ...existingFees,
      inPerson: {
        ...existingInPerson,
        original: fees?.inPerson?.original ?? originalFee ?? existingInPerson.original ?? doctor.original_fees ?? 0,
        discount: fees?.inPerson?.discount ?? discountAmount ?? existingInPerson.discount ?? doctor.discount_amount ?? 0,
        final: fees?.inPerson?.final ?? finalFee ?? existingInPerson.final ?? doctor.consultationFee ?? 0,
      },
      videoCall: {
        ...existingVideoCall,
        original: fees?.videoCall?.original ?? existingVideoCall.original ?? 0,
        discount: fees?.videoCall?.discount ?? existingVideoCall.discount ?? 0,
        final: fees?.videoCall?.final ?? existingVideoCall.final ?? 0,
      },
      voiceCall: {
        ...existingVoiceCall,
        original: fees?.voiceCall?.original ?? existingVoiceCall.original ?? 0,
        discount: fees?.voiceCall?.discount ?? existingVoiceCall.discount ?? 0,
        final: fees?.voiceCall?.final ?? existingVoiceCall.final ?? 0,
      },
      homeVisit: {
        ...existingHomeVisit,
        original: fees?.homeVisit?.original ?? existingHomeVisit.original ?? 0,
        discount: fees?.homeVisit?.discount ?? existingHomeVisit.discount ?? 0,
        final: fees?.homeVisit?.final ?? existingHomeVisit.final ?? 0,
      },
    };
  }

  await doctor.save({ runValidators: false });

  return res.status(200).json({
    success: true,
    message: 'Doctor updated successfully.',
    data: doctor,
  });
});

// DELETE /api/admin/doctors/:id
exports.deleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doctor = await Doctor.findByIdAndDelete(id);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found.',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Doctor deleted successfully.',
  });
});

// PATCH /api/admin/doctors/:id/toggle-status
exports.toggleDoctorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { accessMode } = req.body || {};

  const doctor = await Doctor.findById(id);
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found.',
    });
  }

  const validAccessModes = Object.values(DOCTOR_ACCESS_MODES);
  let nextAccessMode = accessMode;

  if (nextAccessMode !== undefined && !validAccessModes.includes(nextAccessMode)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid doctor access mode.',
    });
  }

  if (!nextAccessMode) {
    nextAccessMode = doctor.isActive === false
      ? DOCTOR_ACCESS_MODES.ACTIVE
      : DOCTOR_ACCESS_MODES.HIDDEN;
  }

  const isRestrictingDoctorAccess = nextAccessMode !== DOCTOR_ACCESS_MODES.ACTIVE;
  doctor.accessMode = nextAccessMode;
  doctor.authRevokedAt = isRestrictingDoctorAccess ? new Date() : doctor.authRevokedAt;
  await doctor.save({ runValidators: false });

  const statusLabelMap = {
    [DOCTOR_ACCESS_MODES.ACTIVE]: 'activated',
    [DOCTOR_ACCESS_MODES.HIDDEN]: 'hidden from patients and login-disabled',
    [DOCTOR_ACCESS_MODES.VISIBLE_UNBOOKABLE]: 'shown to patients with booking disabled',
  };

  return res.status(200).json({
    success: true,
    message: `Doctor ${statusLabelMap[doctor.accessMode] || 'updated'} successfully.`,
    data: { isActive: doctor.isActive, accessMode: doctor.accessMode },
  });
});

// PATCH /api/admin/doctors/reorder
exports.updateDoctorsOrder = asyncHandler(async (req, res) => {
  const { orders } = req.body; // Array of { id, sortOrder }

  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({
      success: false,
      message: 'Orders array is required.',
    });
  }

  if (orders.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No doctors to reorder.',
    });
  }

  const bulkOps = orders
    .filter(item => item.id && item.sortOrder !== undefined)
    .map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { sortOrder: Number(item.sortOrder) } },
      },
    }));

  if (bulkOps.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid orders data provided.',
    });
  }

  try {
    await Doctor.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: 'Doctors reordered successfully.',
    });
  } catch (error) {
    console.error('Bulk reorder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder doctors. Some IDs might be invalid.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ────────────────────────────────────────────────────────────────
// PATIENTS
// ────────────────────────────────────────────────────────────────



// ────────────────────────────────────────────────────────────────
// VERIFICATIONS OVERVIEW
// ────────────────────────────────────────────────────────────────

// GET /api/admin/verifications/pending
exports.getPendingVerifications = asyncHandler(async (req, res) => {
  const { type, limit: rawLimit } = req.query;
  const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 1000);

  const baseFilter = { status: APPROVAL_STATUS.PENDING };

  // Select all fields - no need to exclude anything for verification details
  const [doctors] = await Promise.all([
    (type && type !== ROLES.DOCTOR) ? [] : Doctor.find(baseFilter).select('-password').lean(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      doctors,
    },
  });
});

/**
 * GET /api/admin/doctors-popularity - Get all doctors with followers and views count
 */
exports.getDoctorPopularityStats = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const { sortBy = 'followerCount', sortOrder = 'desc' } = req.query;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    Doctor.find({ status: APPROVAL_STATUS.APPROVED })
      .select('firstName lastName specialization profileImage followerCount viewCount createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Doctor.countDocuments({ status: APPROVAL_STATUS.APPROVED }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }
  });
});

