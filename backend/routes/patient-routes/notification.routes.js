const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { ROLES } = require('../../utils/constants');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../../controllers/patient-controllers/patientNotificationController');

router.get('/', protect(ROLES.PATIENT), getNotifications);
router.get('/unread-count', protect(ROLES.PATIENT), getUnreadCount);
router.patch('/:notificationId/read', protect(ROLES.PATIENT), markAsRead);
router.patch('/read-all', protect(ROLES.PATIENT), markAllAsRead);
router.delete('/:notificationId', protect(ROLES.PATIENT), deleteNotification);

module.exports = router;

