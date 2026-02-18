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
} = require('../../controllers/admin-controllers/adminNotificationController');

router.get('/', protect(ROLES.ADMIN), getNotifications);
router.get('/unread-count', protect(ROLES.ADMIN), getUnreadCount);
router.patch('/:notificationId/read', protect(ROLES.ADMIN), markAsRead);
router.patch('/read-all', protect(ROLES.ADMIN), markAllAsRead);
router.delete('/:notificationId', protect(ROLES.ADMIN), deleteNotification);

module.exports = router;

