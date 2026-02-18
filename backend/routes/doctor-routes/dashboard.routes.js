const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getDashboardStats,
  getAppointments,
  getTodayAppointments,
} = require('../../controllers/doctor-controllers/doctorDashboardController');

router.get('/stats', protect('doctor'), getDashboardStats);
router.get('/appointments', protect('doctor'), getAppointments);
router.get('/appointments/today', protect('doctor'), getTodayAppointments);

module.exports = router;

