const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  createSupportTicket,
  getSupportTickets,
  getSupportHistory,
} = require('../../controllers/doctor-controllers/doctorSupportController');

router.post('/', protect('doctor'), createSupportTicket);
router.get('/', protect('doctor'), getSupportTickets);
router.get('/history', protect('doctor'), getSupportHistory);

module.exports = router;

