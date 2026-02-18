const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
} = require('../../controllers/doctor-controllers/doctorPrescriptionController');

router.post('/', protect('doctor'), createPrescription);
router.get('/', protect('doctor'), getPrescriptions);
router.get('/:id', protect('doctor'), getPrescriptionById);
router.put('/:id', protect('doctor'), updatePrescription);

module.exports = router;

