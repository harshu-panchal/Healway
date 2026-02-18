const asyncHandler = require('../../middleware/asyncHandler');
const Notification = require('../../models/Notification');

const buildPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// GET /api/admin/notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { read, type } = req.query;
  const { page, limit, skip } = buildPagination(req);

  const filter = {
    userId: id,
    userType: 'admin',
  };

  if (read !== undefined) {
    filter.read = read === 'true';
  }

  if (type) {
    filter.type = type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: id, userType: 'admin', read: false }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      unreadCount,
    },
  });
});

// GET /api/admin/notifications/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const { id } = req.auth;

  const unreadCount = await Notification.countDocuments({
    userId: id,
    userType: 'admin',
    read: false,
  });

  return res.status(200).json({
    success: true,
    data: { unreadCount },
  });
});

// PATCH /api/admin/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { notificationId } = req.params;

  const notification = await Notification.findOne({
    _id: notificationId,
    userId: id,
    userType: 'admin',
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  await notification.markAsRead();

  return res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: notification,
  });
});

// PATCH /api/admin/notifications/read-all
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const { id } = req.auth;

  const result = await Notification.updateMany(
    {
      userId: id,
      userType: 'admin',
      read: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  );

  return res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    data: { updatedCount: result.modifiedCount },
  });
});

// DELETE /api/admin/notifications/:id
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    userId: id,
    userType: 'admin',
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Notification deleted',
  });
});

