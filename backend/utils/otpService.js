const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PASSWORD_RESET_CONFIG } = require('./constants');

const generateOtp = (length = PASSWORD_RESET_CONFIG.OTP_LENGTH) => {
  // Default OTP for testing - always return 123456
  // To use random OTP in production, set USE_RANDOM_OTP=true in environment
  if (process.env.USE_RANDOM_OTP === 'true') {
    // Generate random OTP for production
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < length; i += 1) {
      const index = crypto.randomInt(0, digits.length);
      otp += digits[index];
    }

    return otp;
  }
  
  // Default OTP for testing
  return '123456';
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


