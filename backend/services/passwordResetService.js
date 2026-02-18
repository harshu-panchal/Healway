const PasswordResetToken = require('../models/PasswordResetToken');
const { getModelForRole, ROLES } = require('../utils/getModelForRole');
const { PASSWORD_RESET_CONFIG } = require('../utils/constants');
const {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  addMinutes,
  generateResetToken,
} = require('../utils/otpService');
const { sendPasswordResetOtpEmail } = require('./emailService');

const findUserByEmail = async (role, email) => {
  const Model = getModelForRole(role);
  return Model.findOne({ email });
};

const ensureRoleSupported = (role) => {
  const supportedRoles = Object.values(ROLES);
  if (!supportedRoles.includes(role)) {
    const error = new Error('Unsupported role for password reset');
    error.status = 400;
    throw error;
  }
};

const requestPasswordReset = async ({ role, email }) => {
  ensureRoleSupported(role);

  const user = await findUserByEmail(role, email);

  if (!user) {
    const error = new Error('Account not found with provided email');
    error.status = 404;
    throw error;
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  await PasswordResetToken.findOneAndUpdate(
    { email, role },
    {
      email,
      role,
      otpHash,
      otpExpiresAt: addMinutes(PASSWORD_RESET_CONFIG.OTP_EXPIRY_MINUTES),
      attempts: 0,
      maxAttempts: PASSWORD_RESET_CONFIG.MAX_ATTEMPTS,
      verifiedAt: undefined,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendPasswordResetOtpEmail({ role, email, otp });

  return {
    message: 'OTP sent to registered email address.',
  };
};

const verifyPasswordResetOtp = async ({ role, email, otp }) => {
  ensureRoleSupported(role);

  const record = await PasswordResetToken.findOne({ email, role });

  if (!record) {
    const error = new Error('No password reset request found. Please request a new OTP.');
    error.status = 404;
    throw error;
  }

  if (record.otpExpiresAt < new Date()) {
    await record.deleteOne();
    const error = new Error('OTP has expired. Please request a new one.');
    error.status = 410;
    throw error;
  }

  if (record.attempts >= record.maxAttempts) {
    await record.deleteOne();
    const error = new Error('Maximum OTP attempts exceeded. Please request a new OTP.');
    error.status = 429;
    throw error;
  }

  const isMatch = await verifyOtpHash(otp, record.otpHash);

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const error = new Error('Invalid OTP. Please try again.');
    error.status = 400;
    throw error;
  }

  record.verifiedAt = new Date();
  record.resetToken = generateResetToken();
  record.resetTokenExpiresAt = addMinutes(PASSWORD_RESET_CONFIG.RESET_TOKEN_EXPIRY_MINUTES);
  record.attempts = 0;
  await record.save();

  return {
    resetToken: record.resetToken,
    message: 'OTP verified successfully. Use the reset token to set a new password.',
  };
};

const resetPassword = async ({ role, email, resetToken, newPassword }) => {
  ensureRoleSupported(role);

  const record = await PasswordResetToken.findOne({ email, role, resetToken });

  if (!record) {
    const error = new Error('Invalid or expired reset token.');
    error.status = 400;
    throw error;
  }

  if (!record.verifiedAt || record.resetTokenExpiresAt < new Date()) {
    await record.deleteOne();
    const error = new Error('Reset token has expired. Please restart the process.');
    error.status = 410;
    throw error;
  }

  const user = await findUserByEmail(role, email);

  if (!user) {
    await record.deleteOne();
    const error = new Error('Account not found.');
    error.status = 404;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  await record.deleteOne();

  return {
    message: 'Password has been reset successfully.',
  };
};

module.exports = {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
};


