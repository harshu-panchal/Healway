const asyncHandler = require('../../middleware/asyncHandler');
const mongoose = require('mongoose');
const Appointment = require('../../models/Appointment');
const Patient = require('../../models/Patient');
const Consultation = require('../../models/Consultation');
const Prescription = require('../../models/Prescription');
const { getISTDate, parseDateInIST } = require('../../utils/timezoneUtils');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/doctors/patients (Patient queue)
exports.getPatientQueue = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { date } = req.query;

  // Handle date properly - parse in IST timezone to ensure consistent date handling regardless of server timezone
  let sessionDate;
  try {
    if (date) {
      sessionDate = parseDateInIST(date);
    } else {
      sessionDate = getISTDate(); // Use current IST date if no date provided
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Invalid date format: ${date}`,
    });
  }

  sessionDate.setHours(0, 0, 0, 0);
  const sessionEndDate = new Date(sessionDate);
  sessionEndDate.setHours(23, 59, 59, 999);

  console.log(`📅 Doctor ${id} requesting patient queue for date:`, {
    queryDate: date,
    parsedDate: sessionDate.toISOString(),
    dayName: new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long' }),
  });

  const Doctor = require('../../models/Doctor');

  // Parallelize doctor info and appointments query
  const [appointments, doctor] = await Promise.all([
    Appointment.find({
      doctorId: id,
      appointmentDate: { $gte: sessionDate, $lt: sessionEndDate },
      $or: [
        { status: { $in: ['scheduled', 'confirmed', 'called', 'in-consultation', 'in_progress', 'waiting', 'completed'] } },
        { status: 'cancelled', queueStatus: 'no-show' },
        { status: 'cancelled', queueStatus: 'cancelled' }
      ],
      paymentStatus: { $ne: 'pending' },
    })
      .populate('patientId', 'firstName lastName phone profileImage dateOfBirth gender')
      .select('-__v -updatedAt')
      .sort({ tokenNumber: 1 })
      .lean(),
    Doctor.findById(id).select('averageConsultationMinutes').lean()
  ]);

  console.log(`📋 Found ${appointments.length} appointments for doctor ${id} on ${sessionDate.toISOString().split('T')[0]}`);

  // Calculate age from dateOfBirth for each appointment
  const appointmentsWithAge = appointments.map(appt => {
    if (appt.patientId && appt.patientId.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(appt.patientId.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      appt.patientId.age = age;
    } else if (appt.patientId) {
      appt.patientId.age = 0;
    }
    return appt;
  });

  return res.status(200).json({
    success: true,
    data: {
      session: null,
      appointments: appointmentsWithAge || [],
      currentToken: 0,
      averageConsultationMinutes: doctor?.averageConsultationMinutes || 20
    },
  });
});

// GET /api/doctors/patients/:id
exports.getPatientById = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const patientId = req.params.id;

  const patientObjectId = mongoose.Types.ObjectId.isValid(patientId)
    ? new mongoose.Types.ObjectId(patientId)
    : patientId;
  const doctorObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  const [appointment, consultation, patient] = await Promise.all([
    Appointment.findOne({
      doctorId: doctorObjectId,
      patientId: patientObjectId,
    }).select('_id').lean(),
    Consultation.findOne({
      doctorId: doctorObjectId,
      patientId: patientObjectId,
    }).select('_id').lean(),
    Patient.findById(patientId).select('-password').lean()
  ]);

  if (!appointment && !consultation) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found or no appointments with this doctor',
    });
  }

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient account not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: patient,
  });
});

// GET /api/doctors/patients/:id/history
exports.getPatientHistory = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const patientId = req.params.id;

  const patientObjectId = mongoose.Types.ObjectId.isValid(patientId)
    ? new mongoose.Types.ObjectId(patientId)
    : patientId;
  const doctorObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  const [appointment, consultation] = await Promise.all([
    Appointment.findOne({
      doctorId: doctorObjectId,
      patientId: patientObjectId,
    }).select('_id').lean(),
    Consultation.findOne({
      doctorId: doctorObjectId,
      patientId: patientObjectId,
    }).select('_id').lean(),
  ]);

  if (!appointment && !consultation) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found or no appointments with this doctor',
    });
  }

  const [appointments, consultations, prescriptions] = await Promise.all([
    Appointment.find({
      doctorId: doctorObjectId,
      patientId: patientObjectId,
      paymentStatus: { $ne: 'pending' },
    })
      .sort({ appointmentDate: -1 })
      .limit(10)
      .lean(),
    Consultation.find({ doctorId: doctorObjectId, patientId: patientObjectId })
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ consultationDate: -1 })
      .limit(10)
      .lean(),
    Prescription.find({ doctorId: doctorObjectId, patientId: patientObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      appointments,
      consultations,
      prescriptions,
    },
  });
});

// GET /api/doctors/all-patients
exports.getAllPatients = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { search } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const patientIds = await Appointment.distinct('patientId', { doctorId: id });

  const filter = { _id: { $in: patientIds } };
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .select('firstName lastName email phone profileImage dateOfBirth gender address')
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

