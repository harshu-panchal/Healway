const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getAppointments,
  getTodayAppointments,
} = require('../../controllers/doctor-controllers/doctorDashboardController');
const {
  updateAppointment,
} = require('../../controllers/doctor-controllers/doctorAppointmentController');

// GET /api/doctors/appointments - Get all appointments
router.get('/', protect('doctor'), getAppointments);

// GET /api/doctors/appointments/today - Get today's appointments
router.get('/today', protect('doctor'), getTodayAppointments);

// PATCH /api/doctors/appointments/:id - Update appointment
router.patch('/:id', protect('doctor'), updateAppointment);

module.exports = router;

