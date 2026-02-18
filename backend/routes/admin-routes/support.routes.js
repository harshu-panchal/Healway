const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getSupportTickets,
  getSupportTicketById,
  respondToTicket,
  updateTicketStatus,
} = require('../../controllers/admin-controllers/adminSupportController');

router.get('/', protect('admin'), authorize('admin'), getSupportTickets);
router.get('/:id', protect('admin'), authorize('admin'), getSupportTicketById);
router.post('/:id/respond', protect('admin'), authorize('admin'), respondToTicket);
router.patch('/:id/status', protect('admin'), authorize('admin'), updateTicketStatus);

module.exports = router;

