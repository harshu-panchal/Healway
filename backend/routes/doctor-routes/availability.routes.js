const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getAvailability,
  updateAvailability,
} = require('../../controllers/doctor-controllers/doctorAvailabilityController');

// GET /api/doctors/availability - Get availability schedule
router.get('/', protect('doctor'), getAvailability);

// PATCH /api/doctors/availability - Update availability schedule
router.patch('/', protect('doctor'), updateAvailability);

module.exports = router;

