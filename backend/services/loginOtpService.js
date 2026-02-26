const { getModelForRole, ROLES } = require('../utils/getModelForRole');
const { PASSWORD_RESET_CONFIG, APPROVAL_STATUS } = require('../utils/constants');
const {
  generateOtp,
  hashOtp,
  verifyOtpHash,
} = require('../utils/otpService');
const { sendMobileOtp } = require('./smsService');

// In-memory store for OTPs (Replacing Redis)
const otpStore = new Map();

const findUserByPhone = async (role, phone) => {
  const Model = getModelForRole(role);
  return Model.findOne({ phone });
};

const ensureRoleSupported = (role) => {
  const supportedRoles = [ROLES.PATIENT, ROLES.DOCTOR];
  if (!supportedRoles.includes(role)) {
    const error = new Error('Unsupported role for login OTP');
    error.status = 400;
    throw error;
  }
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  // Preserve only digits
  let cleaned = phone.replace(/\D/g, '');

  // If it starts with 0 and is longer than 10 digits (e.g., 091...), remove leading 0
  // But if it's exactly 10 digits starting with 0, keep it (some regions use leading 0)
  if (cleaned.startsWith('0') && cleaned.length > 10) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
};

const requestLoginOtp = async ({ role, phone }) => {
  ensureRoleSupported(role);

  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone || normalizedPhone.length < 10) {
    const error = new Error('Invalid phone number');
    error.status = 400;
    throw error;
  }

  const user = await findUserByPhone(role, normalizedPhone);

  if (!user) {
    const error = new Error('Invalid phone number or account not found');
    error.status = 404;
    throw error;
  }

  if (user.isActive === false) {
    const error = new Error('Account is inactive. Please contact support.');
    error.status = 403;
    throw error;
  }

  if (user.status && user.status !== APPROVAL_STATUS.APPROVED) {
    const error = new Error('Account pending admin approval. Please wait for confirmation.');
    error.status = 403;
    throw error;
  }

  const otp = process.env.NODE_ENV === 'development' ? '123456' : generateOtp();
  const otpHash = await hashOtp(otp);

  const expiryMinutes = PASSWORD_RESET_CONFIG.OTP_EXPIRY_MINUTES || 10;
  const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);

  const otpData = {
    otpHash,
    attempts: 0,
    maxAttempts: PASSWORD_RESET_CONFIG.MAX_ATTEMPTS || 5,
    expiresAt,
  };

  const key = `${role}:${normalizedPhone}`;
  otpStore.set(key, otpData);

  // Send OTP via SMS
  await sendMobileOtp({ phone: normalizedPhone, otp, role });

  return {
    message: 'OTP sent to registered mobile number.',
    phone: normalizedPhone,
  };
};

const verifyLoginOtp = async ({ role, phone, otp }) => {
  ensureRoleSupported(role);

  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone || normalizedPhone.length < 10) {
    const error = new Error('Invalid phone number');
    error.status = 400;
    throw error;
  }

  const key = `${role}:${normalizedPhone}`;
  const record = otpStore.get(key);

  if (!record) {
    const error = new Error('No login OTP request found or OTP expired. Please request a new OTP.');
    error.status = 404;
    throw error;
  }

  // Check expiry
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    const error = new Error('OTP has expired. Please request a new OTP.');
    error.status = 400;
    throw error;
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(key);
    const error = new Error('Maximum OTP attempts exceeded. Please request a new OTP.');
    error.status = 429;
    throw error;
  }

  const isMatch = await verifyOtpHash(otp, record.otpHash);

  if (!isMatch) {
    record.attempts += 1;
    otpStore.set(key, record);

    const error = new Error('Invalid OTP. Please try again.');
    error.status = 400;
    throw error;
  }

  // Get user
  const user = await findUserByPhone(role, normalizedPhone);

  if (!user) {
    otpStore.delete(key);
    const error = new Error('Account not found.');
    error.status = 404;
    throw error;
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Delete OTP record after successful verification
  otpStore.delete(key);

  return {
    user,
    message: 'OTP verified successfully.',
  };
};

module.exports = {
  requestLoginOtp,
  verifyLoginOtp,
  normalizePhone,
};

