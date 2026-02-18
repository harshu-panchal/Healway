const asyncHandler = require('../../middleware/asyncHandler');
const Transaction = require('../../models/Transaction');
const Appointment = require('../../models/Appointment');
const WalletTransaction = require('../../models/WalletTransaction');
const Patient = require('../../models/Patient');
const Doctor = require('../../models/Doctor');
const { calculateProviderEarning } = require('../../utils/commissionConfig');

// Helper function to get date ranges based on period
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      // All time
      startDate = null;
      endDate = null;
  }

  return { startDate, endDate };
};

// GET /api/admin/revenue?period=today|week|month|year
exports.getRevenueOverview = asyncHandler(async (req, res) => {
  const { period = 'all' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const { getCommissionRate } = require('../../utils/commissionConfig');
  const doctorRate = getCommissionRate('doctor');

  // Build date filter for appointments
  const appointmentFilter = { paymentStatus: 'paid' };
  if (startDate && endDate) {
    appointmentFilter.$or = [
      { paidAt: { $gte: startDate, $lte: endDate } },
      {
        $and: [
          { paidAt: { $exists: false } },
          { createdAt: { $gte: startDate, $lte: endDate } }
        ]
      }
    ];
  }

  const [revenueData, monthlyRevenueRaw] = await Promise.all([
    // Aggregation for summary and transactions
    Appointment.aggregate([
      { $match: appointmentFilter },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient'
        }
      },
      {
        $group: {
          _id: null,
          totalGBV: { $sum: '$fee' },
          count: { $sum: 1 },
          transactions: {
            $push: {
              type: 'Doctor',
              provider: {
                $concat: [
                  'Dr. ',
                  { $ifNull: [{ $arrayElemAt: ['$doctor.firstName', 0] }, 'Unknown'] },
                  ' ',
                  { $ifNull: [{ $arrayElemAt: ['$doctor.lastName', 0] }, ''] }
                ]
              },
              patient: {
                $concat: [
                  { $ifNull: [{ $arrayElemAt: ['$patient.firstName', 0] }, 'Unknown'] },
                  ' ',
                  { $ifNull: [{ $arrayElemAt: ['$patient.lastName', 0] }, ''] }
                ]
              },
              gbv: '$fee',
              date: { $ifNull: ['$paidAt', '$createdAt'] }
            }
          }
        }
      }
    ]),
    // Optimized monthly revenue aggregation
    (async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      return Appointment.aggregate([
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
          $group: {
            _id: {
              month: { $month: { $ifNull: ['$paidAt', '$createdAt'] } },
              year: { $year: { $ifNull: ['$paidAt', '$createdAt'] } }
            },
            total: { $sum: '$fee' }
          }
        }
      ]);
    })()
  ]);

  const stats = revenueData[0] || { totalGBV: 0, count: 0, transactions: [] };
  const doctorGBV = stats.totalGBV;
  const doctorCommission = doctorGBV * doctorRate;
  const doctorPayout = doctorGBV - doctorCommission;

  const transactions = stats.transactions.map(t => ({
    ...t,
    commission: t.gbv * doctorRate,
    payout: t.gbv * (1 - doctorRate)
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const mData = monthlyRevenueRaw.find(r => r._id.month === m && r._id.year === y);
    monthlyRevenue.push({
      month: monthNames[d.getMonth()],
      revenue: (mData ? mData.total : 0) * doctorRate
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      totalRevenue: doctorCommission,
      totalGBV: doctorGBV,
      totalPayouts: doctorPayout,
      transactionsCount: stats.count,
      revenueBreakdown: {
        doctor: {
          gbv: doctorGBV,
          commission: doctorCommission,
          payout: doctorPayout,
          appointments: stats.count
        }
      },
      pieChartData: [
        { label: 'Doctors', value: 100, amount: doctorCommission }
      ],
      monthlyRevenue,
      transactions: transactions.slice(0, 50) // Limit to 50 for performance
    }
  });
});

// GET /api/admin/revenue/providers/:type (doctor)
exports.getProviderRevenue = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { period = 'all' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  if (type !== 'doctor') {
    return res.status(400).json({
      success: false,
      message: 'Invalid provider type. Must be doctor',
    });
  }

  const { getCommissionRate } = require('../../utils/commissionConfig');
  const doctorRate = getCommissionRate('doctor');

  // Build date filter for appointments
  const appointmentFilter = { paymentStatus: 'paid' };
  if (startDate && endDate) {
    appointmentFilter.$or = [
      { paidAt: { $gte: startDate, $lte: endDate } },
      {
        $and: [
          { paidAt: { $exists: false } },
          { createdAt: { $gte: startDate, $lte: endDate } }
        ]
      }
    ];
  }

  const providerRevenue = await Appointment.aggregate([
    { $match: appointmentFilter },
    {
      $group: {
        _id: '$doctorId',
        gbv: { $sum: '$fee' },
        appointments: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'doctors',
        localField: '_id',
        foreignField: '_id',
        as: 'doctor'
      }
    },
    { $unwind: '$doctor' },
    {
      $project: {
        id: '$_id',
        name: { $concat: ['Dr. ', '$doctor.firstName', ' ', { $ifNull: ['$doctor.lastName', ''] }] },
        email: '$doctor.email',
        specialty: '$doctor.specialization',
        gbv: 1,
        appointments: 1
      }
    }
  ]);

  const providerSummaries = providerRevenue.map(p => ({
    ...p,
    commission: p.gbv * doctorRate,
    payout: p.gbv * (1 - doctorRate),
    transactions: p.appointments
  }));

  const totals = providerSummaries.reduce(
    (acc, provider) => ({
      totalGBV: acc.totalGBV + provider.gbv,
      totalCommission: acc.totalCommission + provider.commission,
      totalPayout: acc.totalPayout + provider.payout,
      totalAppointments: acc.totalAppointments + (provider.appointments || 0),
      totalTransactions: acc.totalTransactions + provider.transactions,
    }),
    { totalGBV: 0, totalCommission: 0, totalPayout: 0, totalAppointments: 0, totalTransactions: 0 }
  );

  return res.status(200).json({
    success: true,
    data: {
      type,
      totals,
      providers: providerSummaries,
    },
  });
});
