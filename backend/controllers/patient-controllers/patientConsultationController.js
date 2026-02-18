const asyncHandler = require('../../middleware/asyncHandler');
const Consultation = require('../../models/Consultation');
const Appointment = require('../../models/Appointment');
const { getIO } = require('../../config/socket');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/patients/consultations
exports.getConsultations = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { status, date } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = { patientId: id };
  if (status) filter.status = status;
  if (date) {
    const dateObj = new Date(date);
    filter.consultationDate = {
      $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
      $lt: new Date(dateObj.setHours(23, 59, 59, 999)),
    };
  }

  const [consultations, total] = await Promise.all([
    Consultation.find(filter)
      .populate('doctorId', 'firstName lastName specialization profileImage')
      .populate('appointmentId', 'appointmentDate time reason')
      .populate('prescriptionId')
      .sort({ consultationDate: -1 })
      .skip(skip)
      .limit(limit),
    Consultation.countDocuments(filter),
  ]);

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

// GET /api/patients/consultations/:id
exports.getConsultationById = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { consultationId } = req.params;

  const consultation = await Consultation.findOne({
    _id: consultationId,
    patientId: id,
  })
    .populate('doctorId', 'firstName lastName specialization profileImage qualification')
    .populate('appointmentId', 'appointmentDate time reason')
    .populate('prescriptionId');

  if (!consultation) {
    return res.status(404).json({
      success: false,
      message: 'Consultation not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: consultation,
  });
});

// PATCH /api/patients/consultations/:id/complete - Patient marks consultation as complete
exports.completeConsultation = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { consultationId } = req.params;

  const consultation = await Consultation.findOne({
    _id: consultationId,
    patientId: id,
  });

  if (!consultation) {
    return res.status(404).json({
      success: false,
      message: 'Consultation not found',
    });
  }

  if (consultation.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Consultation is already completed',
    });
  }

  if (consultation.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Cannot complete a cancelled consultation',
    });
  }

  consultation.status = 'completed';
  await consultation.save();

  // Update appointment status if exists
  if (consultation.appointmentId) {
    const appointment = await Appointment.findById(consultation.appointmentId);
    if (appointment && appointment.status !== 'completed') {
      appointment.status = 'completed';
      appointment.queueStatus = 'completed';
      await appointment.save();
    }
  }

  // Emit real-time event
  try {
    const io = getIO();
    io.to(`doctor-${consultation.doctorId}`).emit('consultation:completed', {
      consultationId: consultation._id,
      completedBy: 'patient',
    });
    io.to(`patient-${id}`).emit('consultation:completed', {
      consultationId: consultation._id,
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  return res.status(200).json({
    success: true,
    message: 'Consultation marked as completed',
    data: await Consultation.findById(consultation._id)
      .populate('doctorId', 'firstName lastName')
      .populate('appointmentId'),
  });
});

