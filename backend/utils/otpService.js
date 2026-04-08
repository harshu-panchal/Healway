const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OTP_CONFIG } = require('./constants');

const generateOtp = (length = OTP_CONFIG.OTP_LENGTH) => {
  const otpLength = Number.isInteger(Number(length)) && Number(length) > 0
    ? Number(length)
    : OTP_CONFIG.OTP_LENGTH;

  let otp = '';

  for (let i = 0; i < otpLength; i += 1) {
    otp += crypto.randomInt(0, 10).toString();
  }

  return otp;
};

const hashOtp = async (otp) => bcrypt.hash(otp, 10);

const verifyOtpHash = async (otp, hash) => bcrypt.compare(otp, hash);

const addMinutes = (minutes) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

const generateResetToken = () => crypto.randomBytes(32).toString('hex');

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  addMinutes,
  generateResetToken,
};


