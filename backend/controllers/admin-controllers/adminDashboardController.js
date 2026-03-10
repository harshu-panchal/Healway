const asyncHandler = require('../../middleware/asyncHandler');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');
const Transaction = require('../../models/Transaction');
const { APPROVAL_STATUS } = require('../../utils/constants');
const { calculateProviderEarning } = require('../../utils/commissionConfig');

// GET /api/admin/dashboard/stats
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  endOfToday.setHours(23, 59, 59, 999);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  lastMonthStart.setHours(0, 0, 0, 0);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  lastMonthEnd.setHours(23, 59, 59, 999);
  const thisMonthEnd = new Date(now);
  thisMonthEnd.setHours(23, 59, 59, 999);

  const { getCommissionRate } = require('../../utils/commissionConfig');
  const doctorRate = await getCommissionRate('doctor');

  const [
    totalUsers,
    totalDoctors,
    pendingVerifications,
    totalAppointments,
    todayAppointments,
    todayScheduledCount,
    todayRescheduledCount,
    doctorAppointmentsOverview,
    thisMonthUsers,
    lastMonthUsers,
    revenueStats,
    thisMonthConsultations,
    lastMonthConsultations,
  ] = await Promise.all([
    Patient.countDocuments({ isActive: true }),
    Doctor.countDocuments(),
    Doctor.countDocuments({ status: APPROVAL_STATUS.PENDING }),
    Appointment.countDocuments({ paymentStatus: { $ne: 'pending' } }),
    Appointment.countDocuments({
      appointmentDate: {
        $gte: startOfToday,
        $lt: endOfToday,
      },
      paymentStatus: { $ne: 'pending' },
    }),
    // Today's specific counts
    Appointment.countDocuments({
      appointmentDate: { $gte: startOfToday, $lt: endOfToday },
      rescheduledAt: { $exists: true, $ne: null },
      status: { $nin: ['completed', 'cancelled'] }
    }),
    Appointment.countDocuments({
      appointmentDate: { $gte: startOfToday, $lt: endOfToday },
      rescheduledAt: { $exists: false },
      status: { $in: ['scheduled', 'confirmed', 'waiting'] },
      status: { $ne: 'cancelled' }
    }),
    // Doctor appointments overview (top 10 active doctors)
    Appointment.aggregate([
      { $match: { paymentStatus: { $ne: 'pending' } } },
      {
        $group: {
          _id: '$doctorId',
          total: { $sum: 1 },
          scheduled: {
            $sum: {
              $cond: [{ $in: ['$status', ['scheduled', 'confirmed', 'waiting']] }, 1, 0]
            }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: '_id',
          as: 'doctorInfo'
        }
      },
      { $unwind: '$doctorInfo' },
      {
        $project: {
          doctorName: { $concat: ['$doctorInfo.firstName', ' ', '$doctorInfo.lastName'] },
          specialty: '$doctorInfo.specialization',
          doctorId: '$_id',
          total: 1,
          scheduled: 1,
          completed: 1
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]),
    Patient.countDocuments({ isActive: true, createdAt: { $gte: thisMonthStart, $lte: thisMonthEnd } }),
    Patient.countDocuments({ isActive: true, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
    // Use aggregation for revenue stats
    Appointment.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$fee' },
          thisMonthRevenue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $and: [{ $gte: ['$paidAt', thisMonthStart] }, { $lte: ['$paidAt', thisMonthEnd] }] },
                    {
                      $and: [
                        { $not: ['$paidAt'] },
                        { $gte: ['$createdAt', thisMonthStart] },
                        { $lte: ['$createdAt', thisMonthEnd] }
                      ]
                    }
                  ]
                },
                '$fee',
                0
              ]
            }
          },
          lastMonthRevenue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $and: [{ $gte: ['$paidAt', lastMonthStart] }, { $lte: ['$paidAt', lastMonthEnd] }] },
                    {
                      $and: [
                        { $not: ['$paidAt'] },
                        { $gte: ['$createdAt', lastMonthStart] },
                        { $lte: ['$createdAt', lastMonthEnd] }
                      ]
                    }
                  ]
                },
                '$fee',
                0
              ]
            }
          }
        }
      }
    ]),
    Appointment.countDocuments({
      status: 'completed',
      updatedAt: { $gte: thisMonthStart, $lte: thisMonthEnd },
    }),
    Appointment.countDocuments({
      status: 'completed',
      updatedAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    }),
  ]);

  const rev = (revenueStats && revenueStats[0]) || { totalRevenue: 0, thisMonthRevenue: 0, lastMonthRevenue: 0 };
  const totalRevenue = (rev.totalRevenue || 0) * doctorRate;
  const thisMonthRevenue = (rev.thisMonthRevenue || 0) * doctorRate;
  const lastMonthRevenue = (rev.lastMonthRevenue || 0) * doctorRate;

  const statsData = {
    totalUsers,
    totalDoctors,
    pendingVerifications,
    totalAppointments,
    todayAppointments,
    todayScheduledCount,
    todayRescheduledCount,
    doctorAppointmentsOverview,
    totalRevenue,
    thisMonthRevenue,
    lastMonthRevenue,
    revenueGrowth: lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0,
    userGrowth: lastMonthUsers > 0 ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0,
    consultationGrowth: lastMonthConsultations > 0 ? ((thisMonthConsultations - lastMonthConsultations) / lastMonthConsultations) * 100 : 0,
  };

  return res.status(200).json({
    success: true,
    data: statsData,
  });
});

// GET /api/admin/activities
exports.getRecentActivities = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  // Get recent activities from various models
  // Exclude pending payment appointments - only show paid appointments
  const [recentAppointments, recentVerifications] = await Promise.all([
    Appointment.find({
      paymentStatus: { $ne: 'pending' }, // Exclude pending payment appointments
    })
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .select('+rescheduledAt +rescheduledBy +rescheduleReason') // Include rescheduled fields
      .sort({ createdAt: -1 })
      .limit(limit),
    Promise.all([
      Doctor.find({ status: APPROVAL_STATUS.PENDING })
        .select('firstName lastName specialization createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
    ]).then(results => results.flat()),
  ]);

  // Combine and sort by date
  // For appointments, use cancelledAt if cancelled, otherwise use createdAt
  const activities = [
    ...recentAppointments.map(a => ({
      type: 'appointment',
      data: a,
      date: a.cancelledAt || a.rescheduledAt || a.createdAt // Use cancelledAt/rescheduledAt for proper ordering
    })),
    ...recentVerifications.map(v => ({ type: 'verification', data: v, date: v.createdAt })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);

  return res.status(200).json({
    success: true,
    data: activities,
  });
});

// GET /api/admin/dashboard/charts
exports.getChartData = asyncHandler(async (req, res) => {
  const now = new Date();
  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const { getCommissionRate } = require('../../utils/commissionConfig');
  const doctorRate = getCommissionRate('doctor');

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      monthName: monthNames[date.getMonth()],
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
    });
  }

  // Unified revenue aggregation
  const revenueDataRaw = await Appointment.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        $or: [
          { paidAt: { $gte: sixMonthsAgo } },
          { $and: [{ paidAt: { $exists: false } }, { createdAt: { $gte: sixMonthsAgo } }] }
        ]
      }
    },
    {
      $project: {
        fee: 1,
        date: { $ifNull: ['$paidAt', '$createdAt'] }
      }
    },
    {
      $group: {
        _id: {
          month: { $month: '$date' },
          year: { $year: '$date' }
        },
        revenue: { $sum: '$fee' }
      }
    }
  ]);

  // Unified consultations aggregation
  const consultationsDataRaw = await Appointment.aggregate([
    {
      $match: {
        status: 'completed',
        appointmentDate: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          month: { $month: '$appointmentDate' },
          year: { $year: '$appointmentDate' }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  // User growth still needs per-month cumulative check or a clever group
  // For simplicity and since user count is usually smaller than appointments, 
  // we can parallelize the 6 counts
  const userGrowthPromises = months.map(({ end }) =>
    Patient.countDocuments({
      isActive: true,
      createdAt: { $lte: end },
    })
  );

  const userGrowthData = await Promise.all(userGrowthPromises);

  // Map raw data to month structure
  const revenueChart = months.map(m => {
    const monthData = revenueDataRaw.find(r => r._id.month === (m.month + 1) && r._id.year === m.year);
    return {
      month: m.monthName,
      value: (monthData ? monthData.revenue : 0) * doctorRate
    };
  });

  const consultationsChart = months.map(m => {
    const monthData = consultationsDataRaw.find(r => r._id.month === (m.month + 1) && r._id.year === m.year);
    return {
      month: m.monthName,
      consultations: monthData ? monthData.count : 0
    };
  });

  const userGrowthChart = months.map((m, index) => ({
    month: m.monthName,
    users: userGrowthData[index]
  }));

  return res.status(200).json({
    success: true,
    data: {
      revenue: revenueChart,
      userGrowth: userGrowthChart,
      consultations: consultationsChart,
    },
  });
});


