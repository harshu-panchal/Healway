const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getQueue,
  updateQueueStatus,
  markAsPaid,
} = require('../../controllers/doctor-controllers/doctorQueueController');

router.get('/', protect('doctor'), getQueue);
router.patch('/:appointmentId/status', protect('doctor'), updateQueueStatus);
router.patch('/:appointmentId/pay', protect('doctor'), markAsPaid);

module.exports = router;

