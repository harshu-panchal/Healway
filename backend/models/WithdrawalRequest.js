const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userType',
    },
    userType: {
      type: String,
      required: true,
      enum: ['doctor', 'provider'], // Flexible for future roles
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'paid'],
      default: 'pending',
    },
    payoutMethod: {
      type: {
        type: String,
        enum: ['bank_transfer', 'upi', 'cash', 'paytm'],
        required: true,
      },
      details: {
        // Bank Transfer Details
        accountNumber: { type: String },
        ifscCode: { type: String },
        bankName: { type: String },
        accountHolderName: { type: String },
        // UPI Details
        upiId: { type: String },
        // Cash Details
        notes: { type: String },
        address: { type: String },
      },
    },
    adminNotes: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups
withdrawalRequestSchema.index({ userId: 1, userType: 1 });
withdrawalRequestSchema.index({ status: 1 });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
