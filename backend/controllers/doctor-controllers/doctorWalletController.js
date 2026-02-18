const asyncHandler = require('../../middleware/asyncHandler');
const mongoose = require('mongoose');
const WalletTransaction = require('../../models/WalletTransaction');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const Doctor = require('../../models/Doctor');
const { getCommissionRateByRole } = require('../../utils/constants');
const { sendWithdrawalRequestNotification } = require('../../services/notificationService');

// Helper functions
const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/doctors/wallet/balance
exports.getWalletBalance = asyncHandler(async (req, res) => {
  const { id } = req.auth;

  // Convert id to ObjectId to ensure proper matching
  const doctorObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;


  // Calculate balance from all transactions (most accurate method)
  // Sum of all earning transactions minus sum of all withdrawal transactions
  const [allEarningsCalc, allWithdrawalsCalc, pendingWithdrawals, currentMonthStart, lastMonthStart, lastMonthEnd] = await Promise.all([
    WalletTransaction.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          type: 'earning',
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
    WalletTransaction.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          type: 'withdrawal',
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
    WithdrawalRequest.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          status: { $in: ['pending', 'approved'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
    Promise.resolve((() => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    })()),
    Promise.resolve((() => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - 1);
      return date;
    })()),
    Promise.resolve((() => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
      return date;
    })()),
  ]);

  // Calculate balance from transactions
  const balance = (allEarningsCalc[0]?.total || 0) - (allWithdrawalsCalc[0]?.total || 0);
  const pendingAmount = pendingWithdrawals[0]?.total || 0;
  const availableBalance = Math.max(0, balance - pendingAmount);

  // Use already calculated earnings and withdrawals
  const totalEarnings = allEarningsCalc[0]?.total || 0;
  const totalWithdrawals = allWithdrawalsCalc[0]?.total || 0;


  // Calculate this month and last month earnings and withdrawals
  const [thisMonthEarnings, lastMonthEarnings, thisMonthWithdrawals, totalTransactions] = await Promise.all([
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
    // Calculate this month withdrawals from WithdrawalRequest model
    WithdrawalRequest.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).then(result => result[0]?.total || 0),
    WalletTransaction.countDocuments({ userId: doctorObjectId, userType: 'doctor' }),
  ]);



  return res.status(200).json({
    success: true,
    data: {
      balance,
      totalBalance: balance, // Alias for balance
      availableBalance,
      pendingBalance: pendingAmount,
      pendingWithdrawals: pendingAmount,
      totalEarnings,
      totalWithdrawals,
      thisMonthEarnings,
      thisMonthWithdrawals, // Add this month withdrawals
      lastMonthEarnings,
      totalTransactions,
    },
  });
});

// GET /api/doctors/wallet/earnings
exports.getEarnings = asyncHandler(async (req, res) => {
  const { id } = req.auth;

  // Convert id to ObjectId to ensure proper matching
  const doctorObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  const { dateFrom, dateTo } = req.query;
  const { page, limit, skip } = buildPagination(req);

  // Calculate date ranges for aggregations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  lastMonthStart.setHours(0, 0, 0, 0);

  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  lastMonthEnd.setHours(23, 59, 59, 999);

  const currentYearStart = new Date(today.getFullYear(), 0, 1);
  currentYearStart.setHours(0, 0, 0, 0);

  const currentYearEnd = new Date(today.getFullYear(), 11, 31);
  currentYearEnd.setHours(23, 59, 59, 999);

  const baseFilter = {
    userId: doctorObjectId,
    userType: 'doctor',
    type: 'earning',
    status: 'completed',
  };

  // Filter for earnings list (with optional date range)
  const filter = { ...baseFilter };
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      const start = new Date(dateFrom);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Calculate aggregated totals
  const [
    earnings,
    total,
    totalEarnings,
    todayEarnings,
    thisMonthEarnings,
    lastMonthEarnings,
    thisYearEarnings,
  ] = await Promise.all([
    WalletTransaction.find(filter)
      .populate('appointmentId', 'appointmentDate fee')
      .populate('orderId', 'totalAmount status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments(filter),
    // Total earnings (all time)
    WalletTransaction.aggregate([
      {
        $match: baseFilter,
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).then(result => result[0]?.total || 0),
    // Today earnings
    WalletTransaction.aggregate([
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).then(result => result[0]?.total || 0),
    // This month earnings
    WalletTransaction.aggregate([
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: currentMonthStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).then(result => result[0]?.total || 0),
    // Last month earnings
    WalletTransaction.aggregate([
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).then(result => result[0]?.total || 0),
    // This year earnings
    WalletTransaction.aggregate([
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: currentYearStart, $lte: currentYearEnd },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).then(result => result[0]?.total || 0),
  ]);


  return res.status(200).json({
    success: true,
    data: {
      totalEarnings,
      todayEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      thisYearEarnings,
      earnings: earnings,
      items: earnings, // Alias for compatibility
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/doctors/wallet/withdrawals
exports.getWithdrawals = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { status } = req.query;
  const { page, limit, skip } = buildPagination(req);

  // Convert id to ObjectId to ensure proper matching
  const doctorObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  const filter = {
    userId: doctorObjectId,
    userType: 'doctor',
  };
  if (status) filter.status = status;

  // Fetch withdrawal requests from WithdrawalRequest model (not WalletTransaction)
  const [withdrawals, total] = await Promise.all([
    WithdrawalRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WithdrawalRequest.countDocuments(filter),
  ]);


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

// POST /api/doctors/wallet/withdraw
exports.requestWithdrawal = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { amount, paymentMethod, bankAccount, upiId, walletNumber } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid withdrawal amount',
    });
  }

  // Convert id to ObjectId to ensure proper matching
  const doctorObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  // Calculate balance from all transactions (same logic as getWalletBalance)
  const [allEarningsCalc, allWithdrawalsCalc, pendingWithdrawals] = await Promise.all([
    WalletTransaction.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          type: 'earning',
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
    WalletTransaction.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          type: 'withdrawal',
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
    WithdrawalRequest.aggregate([
      {
        $match: {
          userId: doctorObjectId,
          userType: 'doctor',
          status: { $in: ['pending', 'approved'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  // Calculate balance from transactions
  const balance = (allEarningsCalc[0]?.total || 0) - (allWithdrawalsCalc[0]?.total || 0);
  const pendingAmount = pendingWithdrawals[0]?.total || 0;
  const availableBalance = Math.max(0, balance - pendingAmount);


  if (amount > availableBalance) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient balance',
    });
  }

  // Validate payment method
  if (paymentMethod === 'bank' && (!bankAccount || !bankAccount.accountNumber || !bankAccount.ifscCode)) {
    return res.status(400).json({
      success: false,
      message: 'Bank account details are required for bank transfer',
    });
  }

  if (paymentMethod === 'upi' && !upiId) {
    return res.status(400).json({
      success: false,
      message: 'UPI ID is required for UPI transfer',
    });
  }

  if (paymentMethod === 'wallet' && !walletNumber) {
    return res.status(400).json({
      success: false,
      message: 'Wallet number is required for wallet transfer',
    });
  }

  // Map paymentMethod to payoutMethod format expected by model
  let payoutMethod = {};

  if (paymentMethod === 'bank') {
    payoutMethod = {
      type: 'bank_transfer',
      details: {
        accountNumber: bankAccount?.accountNumber || '',
        ifscCode: bankAccount?.ifscCode || '',
        accountHolderName: bankAccount?.accountHolderName || '',
      },
    };
  } else if (paymentMethod === 'upi') {
    payoutMethod = {
      type: 'upi',
      details: {
        upiId: upiId || '',
      },
    };
  } else if (paymentMethod === 'wallet') {
    payoutMethod = {
      type: 'paytm',
      details: {
        paytmNumber: walletNumber || '',
      },
    };
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment method',
    });
  }

  // Create withdrawal request with proper payoutMethod structure
  const withdrawalRequest = await WithdrawalRequest.create({
    userId: id,
    userType: 'doctor',
    amount,
    payoutMethod,
    status: 'pending',
  });

  // Get doctor data
  const doctor = await Doctor.findById(id);

  // Emit real-time event to admins
  try {
    const { getIO } = require('../../config/socket');
    const io = getIO();
    io.to('admins').emit('withdrawal:requested', {
      withdrawal: await WithdrawalRequest.findById(withdrawalRequest._id)
        .populate('userId', 'firstName lastName email phone'),
    });
  } catch (error) {
    console.error('Socket.IO error:', error);
  }

  // Send email notification to doctor
  try {
    await sendWithdrawalRequestNotification({
      provider: doctor,
      withdrawal: withdrawalRequest,
      providerType: 'doctor',
    }).catch((error) => console.error('Error sending withdrawal request email:', error));
  } catch (error) {
    console.error('Error sending email notifications:', error);
  }

  // Send email notification to admins
  try {
    const { notifyAdminsOfWithdrawalRequest } = require('../../services/adminNotificationService');
    await notifyAdminsOfWithdrawalRequest({
      withdrawal: withdrawalRequest,
      provider: doctor,
      providerType: 'doctor',
    }).catch((error) => console.error('Error sending admin withdrawal notification email:', error));
  } catch (error) {
    console.error('Error sending admin email notifications:', error);
  }

  // Create in-app notifications
  try {
    const { createWalletNotification, createAdminNotification } = require('../../services/notificationService');

    // Notify doctor
    await createWalletNotification({
      userId: id,
      userType: 'doctor',
      amount,
      eventType: 'withdrawal_requested',
      withdrawal: withdrawalRequest,
    }).catch((error) => console.error('Error creating doctor withdrawal notification:', error));

    // Notify all admins
    const Admin = require('../../models/Admin');
    const admins = await Admin.find({});
    const doctorName = `${doctor.firstName} ${doctor.lastName}`.trim();

    for (const admin of admins) {
      await createAdminNotification({
        userId: admin._id,
        userType: 'admin',
        eventType: 'withdrawal_requested',
        data: {
          withdrawalId: withdrawalRequest._id,
          providerId: id,
          providerType: 'doctor',
          providerName: doctorName,
          providerEmail: doctor.email,
          providerPhone: doctor.phone,
          amount,
          payoutMethod: {
            type: payoutMethod.type,
            details: payoutMethod.details,
          },
          requestDate: withdrawalRequest.createdAt,
        },
        actionUrl: `/admin/wallet/withdrawals/${withdrawalRequest._id}`,
      }).catch((error) => console.error('Error creating admin withdrawal notification:', error));
    }
  } catch (error) {
    console.error('Error creating notifications:', error);
  }

  return res.status(201).json({
    success: true,
    message: 'Withdrawal request submitted successfully',
    data: withdrawalRequest,
  });
});

// GET /api/doctors/wallet/transactions
exports.getTransactions = asyncHandler(async (req, res) => {
  const { id } = req.auth;

  // Convert id to ObjectId to ensure proper matching
  const doctorObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  const { type, startDate, endDate } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = {
    userId: doctorObjectId,
    userType: 'doctor',
  };

  if (type) filter.type = type;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(filter)
      .populate('appointmentId', 'appointmentDate fee')
      .populate('orderId', 'totalAmount status')
      .populate('withdrawalRequestId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments(filter),
  ]);


  return res.status(200).json({
    success: true,
    data: {
      items: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});
