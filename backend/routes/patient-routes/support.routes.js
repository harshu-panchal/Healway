const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  createSupportTicket,
  getSupportTickets,
  getSupportTicketById,
  getSupportHistory,
} = require('../../controllers/patient-controllers/patientSupportController');

router.post('/', protect('patient'), createSupportTicket);
router.get('/', protect('patient'), getSupportTickets);
router.get('/history', protect('patient'), getSupportHistory);
router.get('/:id', protect('patient'), getSupportTicketById);

module.exports = router;

