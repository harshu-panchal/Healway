const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ['doctor', 'admin', 'patient'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['earning', 'withdrawal', 'commission_deduction', 'refund', 'commission'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: String,
      trim: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    withdrawalRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WithdrawalRequest',
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
walletTransactionSchema.index({ userId: 1, userType: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, createdAt: -1 });
walletTransactionSchema.index({ type: 1, createdAt: -1 });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;

