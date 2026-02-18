const asyncHandler = require('../../middleware/asyncHandler');
const { ROLES, APPROVAL_STATUS } = require('../../utils/constants');
const Doctor = require('../../models/Doctor');

const { sendRoleApprovalEmail } = require('../../services/emailService');

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

// PATCH /api/admin/doctors/reorder
exports.updateDoctorsOrder = asyncHandler(async (req, res) => {
  const { orders } = req.body; // Array of { id, sortOrder }

  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({
      success: false,
      message: 'Orders array is required.',
    });
  }

  const bulkOps = orders.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { sortOrder: item.sortOrder } },
    },
  }));

  await Doctor.bulkWrite(bulkOps);

  // Cache invalidation removed (Redis removed)

  return res.status(200).json({
    success: true,
    message: 'Doctors reordered successfully.',
  });
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

