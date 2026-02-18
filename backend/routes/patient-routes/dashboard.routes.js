const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getDashboard,
} = require('../../controllers/patient-controllers/patientDashboardController');

router.get('/', protect('patient'), getDashboard);

module.exports = router;

