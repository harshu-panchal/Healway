const asyncHandler = require('../../middleware/asyncHandler');
const Appointment = require('../../models/Appointment');
const Consultation = require('../../models/Consultation');
const Patient = require('../../models/Patient');
const WalletTransaction = require('../../models/WalletTransaction');

// GET /api/doctors/dashboard/stats
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const mongoose = require('mongoose');
  const doctorObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Calculate month start and end
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  lastMonthEnd.setHours(23, 59, 59, 999);

  const [
    totalAppointments,
    todayAppointments,
    totalConsultations,
    totalPatients,
    totalEarnings,
    todayEarnings,
    thisMonthEarnings,
    lastMonthEarnings,
    thisMonthConsultations,
    lastMonthConsultations,
  ] = await Promise.all([
    Appointment.countDocuments({
      doctorId: doctorObjectId,
      paymentStatus: { $ne: 'pending' },
    }),
    Appointment.countDocuments({
      doctorId: doctorObjectId,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' },
      paymentStatus: { $ne: 'pending' },
    }),
    Consultation.countDocuments({ doctorId: doctorObjectId, status: 'completed' }),
    Appointment.distinct('patientId', { doctorId: doctorObjectId }).then(ids => ids.length),
    WalletTransaction.aggregate([
      { $match: { userId: doctorObjectId, userType: 'doctor', type: 'earning', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(result => result[0]?.total || 0),
    WalletTransaction.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          type: 'earning',
          status: 'completed',
          createdAt: { $gte: today },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(result => result[0]?.total || 0),
    WalletTransaction.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          type: 'earning',
          status: 'completed',
          createdAt: { $gte: currentMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(result => result[0]?.total || 0),
    WalletTransaction.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          type: 'earning',
          status: 'completed',
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then(result => result[0]?.total || 0),
    Consultation.countDocuments({
      doctorId: doctorObjectId,
      status: 'completed',
      createdAt: { $gte: currentMonthStart },
    }),
    Consultation.countDocuments({
      doctorId: doctorObjectId,
      status: 'completed',
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalAppointments,
      todayAppointments,
      totalConsultations,
      totalPatients,
      totalEarnings,
      todayEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      thisMonthConsultations,
      lastMonthConsultations,
    },
  });
});


// GET /api/doctors/appointments
exports.getAppointments = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { date, status } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { doctorId: id };
  if (status) {
    filter.status = status;
  }
  if (date) {
    const dateObj = new Date(date);
    filter.appointmentDate = {
      $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
      $lt: new Date(dateObj.setHours(23, 59, 59, 999)),
    };
  }

  // Calculate date ranges for statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  currentMonthEnd.setHours(23, 59, 59, 999);
  const currentYearStart = new Date(today.getFullYear(), 0, 1);
  const currentYearEnd = new Date(today.getFullYear(), 11, 31);
  currentYearEnd.setHours(23, 59, 59, 999);

  const [appointments, total, stats] = await Promise.all([
    Appointment.find(filter)
      .populate('patientId', 'firstName lastName phone email profileImage dateOfBirth gender address')
      .sort({ appointmentDate: 1, time: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
    Promise.all([
      Appointment.countDocuments({
        doctorId: id,
        appointmentDate: { $gte: today, $lt: tomorrow },
        status: { $in: ['scheduled', 'confirmed', 'cancelled'] },
        rescheduledAt: { $exists: false },
      }),
      Appointment.countDocuments({
        doctorId: id,
        appointmentDate: { $gte: today, $lt: tomorrow },
        status: { $in: ['scheduled', 'confirmed', 'cancelled'] },
        rescheduledAt: { $exists: true },
      }),
      Appointment.countDocuments({
        doctorId: id,
        appointmentDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
        status: { $in: ['scheduled', 'confirmed', 'cancelled'] },
        rescheduledAt: { $exists: false },
      }),
      Appointment.countDocuments({
        doctorId: id,
        appointmentDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
        status: { $in: ['scheduled', 'confirmed', 'cancelled'] },
        rescheduledAt: { $exists: true },
      }),
      Appointment.countDocuments({
        doctorId: id,
        appointmentDate: { $gte: currentYearStart, $lte: currentYearEnd },
        status: { $in: ['scheduled', 'confirmed', 'cancelled'] },
        rescheduledAt: { $exists: false },
      }),
      Appointment.countDocuments({
        doctorId: id,
        appointmentDate: { $gte: currentYearStart, $lte: currentYearEnd },
        status: { $in: ['scheduled', 'confirmed', 'cancelled'] },
        rescheduledAt: { $exists: true },
      }),
      Appointment.countDocuments({
        doctorId: id,
        status: { $in: ['scheduled', 'confirmed', 'cancelled'] },
        rescheduledAt: { $exists: false },
      }),
      Appointment.countDocuments({
        doctorId: id,
        status: { $in: ['scheduled', 'confirmed', 'cancelled'] },
        rescheduledAt: { $exists: true },
      }),
    ]).then(([
      todayScheduled,
      todayRescheduled,
      monthlyScheduled,
      monthlyRescheduled,
      yearlyScheduled,
      yearlyRescheduled,
      totalScheduled,
      totalRescheduled,
    ]) => ({
      today: {
        scheduled: todayScheduled,
        rescheduled: todayRescheduled,
        total: todayScheduled + todayRescheduled,
      },
      monthly: {
        scheduled: monthlyScheduled,
        rescheduled: monthlyRescheduled,
        total: monthlyScheduled + monthlyRescheduled,
      },
      yearly: {
        scheduled: yearlyScheduled,
        rescheduled: yearlyRescheduled,
        total: yearlyScheduled + yearlyRescheduled,
      },
      total: {
        scheduled: totalScheduled,
        rescheduled: totalRescheduled,
        total: totalScheduled + totalRescheduled,
      },
    })),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: appointments.map(appt => ({
        ...appt,
        id: appt._id,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      statistics: stats,
    },
  });
});
// GET /api/doctors/appointments/today
exports.getTodayAppointments = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const appointments = await Appointment.find({
    doctorId: id,
    appointmentDate: { $gte: today, $lt: tomorrow },
    status: { $in: ['scheduled', 'confirmed'] },
    paymentStatus: { $ne: 'pending' }, // Exclude pending payment appointments
  })
    .populate('patientId', 'firstName lastName phone profileImage')
    .sort({ time: 1 });

  return res.status(200).json({
    success: true,
    data: appointments,
  });
});

