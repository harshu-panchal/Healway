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
} = require('../../controllers/doctor-controllers/doctorNotificationController');

router.get('/', protect(ROLES.DOCTOR), getNotifications);
router.get('/unread-count', protect(ROLES.DOCTOR), getUnreadCount);
router.patch('/:notificationId/read', protect(ROLES.DOCTOR), markAsRead);
router.patch('/read-all', protect(ROLES.DOCTOR), markAllAsRead);
router.delete('/:notificationId', protect(ROLES.DOCTOR), deleteNotification);

module.exports = router;

