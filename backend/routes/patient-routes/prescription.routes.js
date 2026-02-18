const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getPrescriptions,
  getPrescriptionById,
} = require('../../controllers/patient-controllers/patientPrescriptionController');

router.get('/prescriptions', protect('patient'), getPrescriptions);
router.get('/prescriptions/:id', protect('patient'), getPrescriptionById);

module.exports = router;
