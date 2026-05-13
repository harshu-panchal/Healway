const mongoose = require('mongoose');
const asyncHandler = require('../../middleware/asyncHandler');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const WalletTransaction = require('../../models/WalletTransaction');
const Transaction = require('../../models/Transaction');
const Doctor = require('../../models/Doctor');
const { getIO } = require('../../config/socket');
const { sendWithdrawalStatusUpdateEmail } = require('../../services/notificationService');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/admin/wallet/overview
exports.getWalletOverview = asyncHandler(async (req, res) => {
  // Get period filter from query (daily, weekly, monthly, yearly, all)
  const { period = 'all' } = req.query;

  // Calculate date range based on period
  const now = new Date();
  let dateFilter = {};

  if (period === 'daily') {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    dateFilter = { $gte: todayStart };
  } else if (period === 'weekly') {
    const weekStart = new Date(now);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    weekStart.setDate(now.getDate() - dayOfWeek); // Start of week (Sunday = 0)
    weekStart.setHours(0, 0, 0, 0);
    dateFilter = { $gte: weekStart };
  } else if (period === 'monthly') {
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    dateFilter = { $gte: monthStart };
  } else if (period === 'yearly') {
    const yearStart = new Date(now);
    yearStart.setMonth(0, 1); // January 1st
    yearStart.setHours(0, 0, 0, 0);
    dateFilter = { $gte: yearStart };
  }

  // Calculate total commission from appointments
  const Appointment = require('../../models/Appointment');
  const { calculateProviderEarning } = require('../../utils/commissionConfig');

  let appointmentQuery = { paymentStatus: 'paid' };

  if (Object.keys(dateFilter).length > 0) {
    // For appointments, use paidAt if exists, otherwise createdAt
    appointmentQuery.$or = [
      { paidAt: dateFilter },
      { $and: [{ paidAt: { $exists: false } }, { createdAt: dateFilter }] }
    ];
  }

  // Get commission rate once
  const { getCommissionRate } = require('../../utils/commissionConfig');
  const doctorCommissionRate = await getCommissionRate('doctor');
  console.log(`📊 Admin Overview: Using doctor commission rate ${doctorCommissionRate * 100}%`);

  // Get paid appointments and calculate commission (with date filter if applicable)
  // Get total earnings from doctors using aggregation (much faster than fetching all records)
  const earningsMatch = { ...appointmentQuery };
  
  const [earningsResult, totalTransactions, activeDoctorsCount, withdrawals, pendingWithdrawalRes, approvedWithdrawalRes] = await Promise.all([
    Appointment.aggregate([
      { $match: earningsMatch },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]),
    Appointment.countDocuments(earningsMatch),
    Doctor.countDocuments({ status: 'approved', isActive: true }),
    WithdrawalRequest.aggregate([
      {
        $group: {
          _id: null,
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
        }
      }
    ]),
    WithdrawalRequest.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    WithdrawalRequest.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);

  const totalGBVFromAppointments = earningsResult[0]?.total || 0;
  const totalCommission = totalGBVFromAppointments * doctorCommissionRate;

  const pendingAmount = pendingWithdrawalRes[0]?.total || 0;
  const approvedAmount = approvedWithdrawalRes[0]?.total || 0;
  const totalPaidOut = withdrawals[0]?.paid || 0;

  // Calculate available balance
  const committedWithdrawals = totalPaidOut + approvedAmount + pendingAmount;
  const availableBalance = Math.max(0, totalCommission - committedWithdrawals);

  // Calculate this month and last month earnings
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const lastMonthStart = new Date(currentMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  const lastMonthEnd = new Date(currentMonthStart);
  lastMonthEnd.setDate(0);
  lastMonthEnd.setHours(23, 59, 59, 999);

  // Calculate this month and last month commission from appointments
  const thisMonthAppointments = await Appointment.find({
    paymentStatus: 'paid',
    $or: [
      { paidAt: { $gte: currentMonthStart } },
      { $and: [{ paidAt: { $exists: false } }, { createdAt: { $gte: currentMonthStart } }] }
    ]
  }).lean();

  let thisMonthCommission = 0;
  for (const apt of thisMonthAppointments) {
    if (apt.fee) {
      const { commission } = await calculateProviderEarning(apt.fee, 'doctor');
      thisMonthCommission += commission;
    }
  }

  const lastMonthAppointments = await Appointment.find({
    paymentStatus: 'paid',
    $or: [
      { paidAt: { $gte: lastMonthStart, $lte: lastMonthEnd } },
      { $and: [{ paidAt: { $exists: false } }, { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }] }
    ]
  }).lean();

  let lastMonthCommission = 0;
  for (const apt of lastMonthAppointments) {
    if (apt.fee) {
      const { commission } = await calculateProviderEarning(apt.fee, 'doctor');
      lastMonthCommission += commission;
    }
  }

  const adminAvailableBalance = totalCommission - committedWithdrawals;

  return res.status(200).json({
    success: true,
    data: {
      totalEarnings: totalCommission,
      totalCommission: totalCommission,
      doctorEarnings: totalGBVFromAppointments - totalCommission,
      totalGBV: totalGBVFromAppointments,
      availableBalance: availableBalance,
      pendingWithdrawals: pendingAmount,
      approvedWithdrawals: approvedAmount,
      totalPaidOut: totalPaidOut,
      thisMonthEarnings: thisMonthCommission,
      lastMonthEarnings: lastMonthCommission,
      totalTransactions: totalTransactions,
      activeDoctors: activeDoctorsCount,
      period: period,
      periodEarnings: totalCommission,
    },
  });
});

// GET /api/admin/wallet/providers
exports.getProviderSummaries = asyncHandler(async (req, res) => {
  const { role, period = 'all' } = req.query;

  const now = new Date();
  let dateFilter = {};

  if (period === 'daily') {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    dateFilter = { $gte: todayStart };
  } else if (period === 'weekly') {
    const weekStart = new Date(now);
    const dayOfWeek = now.getDay();
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    dateFilter = { $gte: weekStart };
  } else if (period === 'monthly') {
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    dateFilter = { $gte: monthStart };
  } else if (period === 'yearly') {
    const yearStart = new Date(now);
    yearStart.setMonth(0, 1);
    yearStart.setHours(0, 0, 0, 0);
    dateFilter = { $gte: yearStart };
  }

  const roles = role ? [role] : ['doctor'];
  if (role && role !== 'doctor') {
    return res.status(200).json({ success: true, data: { items: [], stats: { total: 0, doctors: 0 } } });
  }

  // 1. Get all doctors first
  const providers = await Doctor.find()
    .select('firstName lastName email phone')
    .lean();

  const providerIds = providers.map(p => p._id);

  // 2. Bulk aggregate earnings (all-time and period)
  const earningsMatch = { 
    userId: { $in: providerIds }, 
    userType: { $in: roles }, 
    type: 'earning', 
    status: 'completed' 
  };
  
  const [allTimeEarningsRes, periodEarningsRes] = await Promise.all([
    WalletTransaction.aggregate([
      { $match: earningsMatch },
      { $group: { _id: '$userId', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Object.keys(dateFilter).length > 0 ? WalletTransaction.aggregate([
      { $match: { ...earningsMatch, createdAt: dateFilter } },
      { $group: { _id: '$userId', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]) : Promise.resolve([])
  ]);

  // 3. Bulk aggregate withdrawals
  const withdrawalsRes = await WithdrawalRequest.aggregate([
    { $match: { userId: { $in: providerIds }, userType: { $in: roles } } },
    {
      $group: {
        _id: '$userId',
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] } },
        paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
      }
    }
  ]);

  // Create lookup maps
  const earningsMap = new Map(allTimeEarningsRes.map(e => [e._id.toString(), e]));
  const periodMap = new Map(periodEarningsRes.map(e => [e._id.toString(), e]));
  const withdrawalsMap = new Map(withdrawalsRes.map(w => [w._id.toString(), w]));

  const summaries = providers.map(provider => {
    const idStr = provider._id.toString();
    const allTime = earningsMap.get(idStr) || { total: 0, count: 0 };
    const periodData = periodMap.get(idStr) || { total: 0, count: 0 };
    const w = withdrawalsMap.get(idStr) || { pending: 0, approved: 0, paid: 0 };

    const totalEarnings = Number(allTime.total) || 0;
    const totalTransactions = Number(allTime.count) || 0;
    const periodEarningsAmount = Number(periodData.total) || 0;
    const periodTransactions = Number(periodData.count) || 0;

    const pendingBalance = Number(w.pending) || 0;
    const approvedBalance = Number(w.approved) || 0;
    const totalWithdrawals = Number(w.paid) || 0;
    const availableBalance = Math.max(0, totalEarnings - (pendingBalance + approvedBalance + totalWithdrawals));

    const providerName = `${provider.firstName || ''} ${provider.lastName || ''}`.trim();

    return {
      _id: provider._id,
      providerId: provider._id,
      role: 'doctor', // We only support doctors here now
      type: 'doctor',
      name: providerName,
      email: provider.email,
      phone: provider.phone,
      totalEarnings,
      periodEarnings: periodEarningsAmount,
      totalTransactions,
      periodTransactions,
      availableBalance,
      pendingBalance,
      approvedBalance,
      totalWithdrawals,
      pendingWithdrawal: pendingBalance,
      approvedWithdrawal: approvedBalance,
      paidWithdrawal: totalWithdrawals,
      balance: availableBalance
    };
  });

  console.log(`👨‍⚕️ Provider Summaries: Found ${summaries.length} doctors`);

  return res.status(200).json({
    success: true,
    data: {
      items: summaries,
      stats: {
        total: summaries.length,
        doctors: summaries.filter(s => s.type === 'doctor').length,
      }
    }
  });
});

// GET /api/admin/wallet/withdrawals
exports.getWithdrawals = asyncHandler(async (req, res) => {
  const { status, role } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = {};
  if (status) filter.status = status;
  if (role) filter.userType = role;
  else filter.userType = 'doctor'; // Only doctors now

  const withdrawals = await WithdrawalRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await WithdrawalRequest.countDocuments(filter);

  for (const withdrawal of withdrawals) {
    if (withdrawal.userId && withdrawal.userType === 'doctor') {
      const doctor = await Doctor.findById(withdrawal.userId)
        .select('firstName lastName email phone')
        .lean();
      if (doctor) {
        withdrawal.userId = doctor;
      }
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      items: withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// PATCH /api/admin/wallet/withdrawals/:id
exports.updateWithdrawalStatus = asyncHandler(async (req, res) => {
  const { id: withdrawalId } = req.params;
  const { status, adminNote, payoutReference } = req.body;

  const { WITHDRAWAL_STATUS } = require('../../utils/constants');
  const validStatuses = Object.values(WITHDRAWAL_STATUS);

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Valid status is required',
    });
  }

  const withdrawal = await WithdrawalRequest.findById(withdrawalId);
  if (!withdrawal) {
    return res.status(404).json({
      success: false,
      message: 'Withdrawal request not found',
    });
  }

  withdrawal.status = status;
  if (adminNote) withdrawal.adminNote = adminNote;
  if (payoutReference) withdrawal.payoutReference = payoutReference;
  if (status === WITHDRAWAL_STATUS.PAID) {
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.auth.id;
  }

  await withdrawal.save();

  if (status === WITHDRAWAL_STATUS.PAID) {
    const WalletTransaction = require('../../models/WalletTransaction');
    const latestTransaction = await WalletTransaction.findOne({
      userId: withdrawal.userId,
      userType: withdrawal.userType,
    }).sort({ createdAt: -1 });

    const currentBalance = latestTransaction?.balance || 0;
    const newBalance = Math.max(0, currentBalance - withdrawal.amount);

    await WalletTransaction.create({
      userId: withdrawal.userId,
      userType: withdrawal.userType,
      type: 'withdrawal',
      amount: withdrawal.amount,
      balance: newBalance,
      status: 'completed',
      description: 'Withdrawal processed',
      referenceId: withdrawal._id.toString(),
      withdrawalRequestId: withdrawal._id,
    });
  }

  let provider = null;
  if (withdrawal.userType === 'doctor') {
    provider = await Doctor.findById(withdrawal.userId).lean();
  }

  try {
    const io = getIO();
    io.to(`${withdrawal.userType}-${withdrawal.userId}`).emit('withdrawal:status:updated', {
      withdrawalId: withdrawal._id,
      status,
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  if (provider && (status === 'approved' || status === 'paid')) {
    try {
      const Admin = require('../../models/Admin');
      const admin = await Admin.findById(req.auth.id).select('name email');

      const withdrawalForEmail = {
        ...withdrawal.toObject(),
        adminName: admin?.name || 'Admin',
        adminNote: withdrawal.adminNote,
        payoutReference: withdrawal.payoutReference,
        rejectionReason: withdrawal.rejectionReason,
        payoutMethod: withdrawal.payoutMethod,
        processedAt: withdrawal.processedAt,
      };

      await sendWithdrawalStatusUpdateEmail({
        provider,
        withdrawal: withdrawalForEmail,
        providerType: withdrawal.userType,
      }).catch((error) => console.error('Error sending withdrawal status update email:', error));
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }
  }

  try {
    const { createWalletNotification } = require('../../services/notificationService');
    const Admin = require('../../models/Admin');
    const admin = await Admin.findById(req.auth.id).select('name email');

    let eventType = null;

    if (status === 'approved') eventType = 'withdrawal_approved';
    else if (status === 'paid') eventType = 'withdrawal_paid';
    else if (status === 'rejected') eventType = 'withdrawal_rejected';

    if (eventType && provider) {
      const withdrawalWithAdmin = {
        ...withdrawal.toObject(),
        adminName: admin?.name || 'Admin',
        adminId: req.auth.id,
        adminNote: withdrawal.adminNote,
        payoutReference: withdrawal.payoutReference,
        rejectionReason: withdrawal.rejectionReason,
        payoutMethod: withdrawal.payoutMethod,
        processedAt: withdrawal.processedAt,
      };

      await createWalletNotification({
        userId: withdrawal.userId,
        userType: withdrawal.userType,
        amount: withdrawal.amount,
        eventType,
        withdrawal: withdrawalWithAdmin,
        sendEmail: status === 'approved' || status === 'paid',
      }).catch((error) => console.error('Error creating withdrawal status notification:', error));
    }
  } catch (error) {
    console.error('Error creating notifications:', error);
  }

  return res.status(200).json({
    success: true,
    message: 'Withdrawal status updated successfully',
    data: withdrawal,
  });
});

// GET /api/admin/wallet/balance - Get admin wallet balance
exports.getAdminWalletBalance = asyncHandler(async (req, res) => {
  const patientPayments = await Transaction.aggregate([
    { $match: { userType: 'patient', type: 'payment', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const balance = patientPayments[0]?.total || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPayments = await Transaction.aggregate([
    {
      $match: {
        userType: 'patient',
        type: 'payment',
        status: 'completed',
        createdAt: { $gte: today },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const todayTotal = todayPayments[0]?.total || 0;

  return res.status(200).json({
    success: true,
    data: {
      balance,
      todayTotal,
    },
  });
});

// GET /api/admin/wallet/transactions - Get admin wallet transactions
exports.getAdminWalletTransactions = asyncHandler(async (req, res) => {
  const { type, category, startDate, endDate } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const transactionType = type && type !== 'all' ? type : null;

  const dateFilter = {};
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    dateFilter.$gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }

  let filter = { status: 'completed' };
  
  if (transactionType) {
    filter.type = transactionType;
  }

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (Object.keys(dateFilter).length > 0) {
    filter.createdAt = dateFilter;
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('appointmentId', 'appointmentDate fee')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  const Patient = require('../../models/Patient');
  const Doctor = require('../../models/Doctor');

  // Collect all unique user IDs to fetch in bulk
  const patientIds = [...new Set(transactions.filter(t => t.userType === 'patient').map(t => t.userId))];
  const doctorIds = [...new Set(transactions.filter(t => t.userType === 'doctor').map(t => t.userId))];

  const [patients, doctors] = await Promise.all([
    Patient.find({ _id: { $in: patientIds } }).select('firstName lastName email phone').lean(),
    Doctor.find({ _id: { $in: doctorIds } }).select('firstName lastName email phone').lean()
  ]);

  const patientMap = new Map(patients.map(p => [p._id.toString(), p]));
  const doctorMap = new Map(doctors.map(d => [d._id.toString(), d]));

  const enrichedTransactions = transactions.map(transaction => {
    const transactionObj = transaction.toObject();
    const userIdStr = transaction.userId?.toString();

    if (transaction.userType === 'patient') {
      const patient = patientMap.get(userIdStr);
      if (patient) {
        transactionObj.patient = patient;
        transactionObj.patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        transactionObj.providerName = transactionObj.patientName;
      }
    } else if (transaction.userType === 'doctor') {
      const doctor = doctorMap.get(userIdStr);
      if (doctor) {
        transactionObj.doctor = doctor;
        transactionObj.providerName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
      }
    } else if (transaction.userType === 'admin') {
      transactionObj.providerName = 'Platform';
      transactionObj.providerType = 'admin';
    }

    return transactionObj;
  });

  return res.status(200).json({
    success: true,
    data: {
      items: enrichedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});
