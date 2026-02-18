const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getCompleteHistory,
  getPrescriptionHistory,
  getAppointmentHistory,
} = require('../../controllers/patient-controllers/patientHistoryController');

// GET /api/patients/history - Complete medical history
router.get('/', protect('patient'), getCompleteHistory);

// GET /api/patients/history/prescriptions - Prescription history
router.get('/prescriptions', protect('patient'), getPrescriptionHistory);

// GET /api/patients/history/appointments - Appointment history
router.get('/appointments', protect('patient'), getAppointmentHistory);

module.exports = router;
