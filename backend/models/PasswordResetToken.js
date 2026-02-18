const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, required: true, trim: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    verifiedAt: { type: Date },
    resetToken: { type: String },
    resetTokenExpiresAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

passwordResetTokenSchema.index({ email: 1, role: 1 }, { unique: true });
passwordResetTokenSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { verifiedAt: { $exists: false } } });
passwordResetTokenSchema.index({ resetTokenExpiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { resetToken: { $exists: true } } });

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);


