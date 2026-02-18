const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getPatientQueue,
  getPatientById,
  getPatientHistory,
  getAllPatients,
} = require('../../controllers/doctor-controllers/doctorPatientController');

router.get('/queue', protect('doctor'), getPatientQueue);
router.get('/all', protect('doctor'), getAllPatients);
router.get('/:id', protect('doctor'), getPatientById);
router.get('/:id/history', protect('doctor'), getPatientHistory);

module.exports = router;

