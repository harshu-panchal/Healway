const express = require('express');
const {
  registerPatient,
  loginPatient,
  requestLoginOtp,
  getPatientProfile,
  updatePatientProfile,
  logoutPatient,
  refreshToken,
  getPatientById,
} = require('../../controllers/patient-controllers/patientAuthController');
const { protect } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');
const { authRateLimiter, otpRateLimiter, passwordResetRateLimiter } = require('../../middleware/rateLimiter');
const { sanitizeInput } = require('../../middleware/validationMiddleware');

const router = express.Router();

// Apply rate limiting and input sanitization to auth endpoints
router.post('/signup', sanitizeInput, authRateLimiter, registerPatient);
router.post('/login/otp', sanitizeInput, otpRateLimiter, requestLoginOtp);
router.post('/login', sanitizeInput, authRateLimiter, loginPatient);

router.post('/refresh-token', sanitizeInput, refreshToken);
router.get('/me', protect(ROLES.PATIENT), getPatientProfile);
router.put('/me', protect(ROLES.PATIENT), sanitizeInput, updatePatientProfile);
router.post('/logout', protect(ROLES.PATIENT), logoutPatient);
router.get('/profile/:id', protect(ROLES.PATIENT, ROLES.ADMIN), getPatientById);

module.exports = router;


