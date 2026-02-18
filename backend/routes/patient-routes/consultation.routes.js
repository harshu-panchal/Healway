const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getConsultations,
  getConsultationById,
  completeConsultation,
} = require('../../controllers/patient-controllers/patientConsultationController');

router.get('/', protect('patient'), getConsultations);
router.get('/:id', protect('patient'), getConsultationById);
router.patch('/:id/complete', protect('patient'), completeConsultation);

module.exports = router;

