const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
  getAppointments,
  getUpcomingAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  createAppointmentPaymentOrder,
  verifyAppointmentPayment,
} = require('../../controllers/patient-controllers/patientAppointmentController');

router.get('/', protect('patient'), getAppointments);
router.get('/upcoming', protect('patient'), getUpcomingAppointments);
router.post('/', protect('patient'), createAppointment);
router.post('/:id/payment/order', protect('patient'), createAppointmentPaymentOrder);
router.post('/:id/payment/verify', protect('patient'), verifyAppointmentPayment);
router.patch('/:id', protect('patient'), updateAppointment);
router.patch('/:id/reschedule', protect('patient'), rescheduleAppointment);
router.delete('/:id', protect('patient'), cancelAppointment);

module.exports = router;

