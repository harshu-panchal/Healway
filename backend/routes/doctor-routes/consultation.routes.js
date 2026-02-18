const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getConsultations,
  createConsultation,
  updateConsultation,
  getConsultationById,
  getAllConsultations,
} = require('../../controllers/doctor-controllers/doctorConsultationController');

router.get('/', protect('doctor'), getConsultations);
router.get('/all', protect('doctor'), getAllConsultations);
router.post('/', protect('doctor'), createConsultation);
router.patch('/:id', protect('doctor'), updateConsultation);
router.get('/:id', protect('doctor'), getConsultationById);

module.exports = router;
