const express = require('express');
const {
  registerDoctor,
  loginDoctor,
  requestLoginOtp,
  getDoctorProfile,
  updateDoctorProfile,
  logoutDoctor,
  refreshToken,
  getDoctorById,
} = require('../../controllers/doctor-controllers/doctorAuthController');
const { protect } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');
const { authRateLimiter, otpRateLimiter, passwordResetRateLimiter } = require('../../middleware/rateLimiter');
const { sanitizeInput } = require('../../middleware/validationMiddleware');

const router = express.Router();

// Apply rate limiting and input sanitization to auth endpoints
router.post('/signup', sanitizeInput, authRateLimiter, registerDoctor);
router.post('/login/otp', sanitizeInput, otpRateLimiter, requestLoginOtp);
router.post('/login', sanitizeInput, authRateLimiter, loginDoctor);

router.post('/refresh-token', sanitizeInput, refreshToken);
router.get('/me', protect(ROLES.DOCTOR), getDoctorProfile);
router.put('/me', protect(ROLES.DOCTOR), sanitizeInput, updateDoctorProfile);
router.post('/logout', protect(ROLES.DOCTOR), logoutDoctor);
router.get('/profile/:id', protect([ROLES.DOCTOR, ROLES.ADMIN]), getDoctorById);

module.exports = router;


