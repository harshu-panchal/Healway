const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getAnnouncements,
} = require('../../controllers/patient-controllers/patientAnnouncementController');

router.get('/', protect('patient'), getAnnouncements);

module.exports = router;
