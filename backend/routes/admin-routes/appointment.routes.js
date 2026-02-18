const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
} = require('../../controllers/admin-controllers/adminAppointmentController');

router.get('/', protect('admin'), authorize('admin'), getAppointments);
router.get('/:id', protect('admin'), authorize('admin'), getAppointmentById);
router.patch('/:id', protect('admin'), authorize('admin'), updateAppointment);
router.delete('/:id', protect('admin'), authorize('admin'), cancelAppointment);

module.exports = router;

