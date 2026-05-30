const Announcement = require('../../models/Announcement');
const Doctor = require('../../models/Doctor');
const Patient = require('../../models/Patient');
const asyncHandler = require('../../middleware/asyncHandler');
const { getIO } = require('../../config/socket');
const { sendPushNotification } = require('../../services/firebaseAdminService');

const CHUNK_SIZE = 500;

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const collectUserTokens = (users = []) => {
  const allTokens = users.flatMap((user) => [
    ...(Array.isArray(user.fcmTokens) ? user.fcmTokens : []),
    ...(Array.isArray(user.fcmTokenMobile) ? user.fcmTokenMobile : []),
  ]);
  return [...new Set(allTokens.filter(Boolean))];
};

const sendAnnouncementPushNotifications = async (announcement) => {
  try {
    const normalizedTargetType = announcement.targetType || 'all';
    let tokens = [];

    if (normalizedTargetType === 'doctors') {
      const doctors = await Doctor.find({ isActive: { $ne: false } }).select('fcmTokens fcmTokenMobile');
      tokens = collectUserTokens(doctors);
    } else if (normalizedTargetType === 'patients') {
      const patients = await Patient.find({ isActive: { $ne: false } }).select('fcmTokens fcmTokenMobile');
      tokens = collectUserTokens(patients);
    } else if (normalizedTargetType === 'my_patients' && announcement.senderId) {
      const Appointment = require('../../models/Appointment');
      const appointments = await Appointment.find({ doctorId: announcement.senderId }).select('patientId');
      const patientIds = [...new Set(appointments.map(app => app.patientId.toString()))];
      const patients = await Patient.find({ _id: { $in: patientIds }, isActive: { $ne: false } }).select('fcmTokens fcmTokenMobile');
      tokens = collectUserTokens(patients);
    } else if (normalizedTargetType === 'specific_patients' && Array.isArray(announcement.targetPatients) && announcement.targetPatients.length > 0) {
      const patients = await Patient.find({ _id: { $in: announcement.targetPatients }, isActive: { $ne: false } }).select('fcmTokens fcmTokenMobile');
      tokens = collectUserTokens(patients);
    } else {
      const [doctors, patients] = await Promise.all([
        Doctor.find({ isActive: { $ne: false } }).select('fcmTokens fcmTokenMobile'),
        Patient.find({ isActive: { $ne: false } }).select('fcmTokens fcmTokenMobile'),
      ]);
      tokens = collectUserTokens([...doctors, ...patients]);
    }

    if (!tokens.length) return;

    const payload = {
      title: announcement.title || 'New Announcement',
      body: announcement.content || 'You have a new announcement.',
      data: {
        type: 'announcement',
        announcementId: announcement._id?.toString() || '',
        targetType: announcement.targetType || 'all',
      },
      priority: announcement.priority || 'high',
    };

    const tokenChunks = chunkArray(tokens, CHUNK_SIZE);
    await Promise.allSettled(tokenChunks.map((tokenChunk) => sendPushNotification(tokenChunk, payload)));
  } catch (error) {
    console.error('Failed to send announcement push notifications:', error.message);
  }
};

const createAnnouncementInAppNotifications = async (announcement) => {
  try {
    const Notification = require('../../models/Notification');
    const normalizedTargetType = announcement.targetType || 'all';
    let userIds = [];

    if (normalizedTargetType === 'doctors') {
      const doctors = await Doctor.find({ isActive: { $ne: false } }).select('_id');
      userIds = doctors.map(d => ({ userId: d._id, userType: 'doctor' }));
    } else if (normalizedTargetType === 'patients') {
      const patients = await Patient.find({ isActive: { $ne: false } }).select('_id');
      userIds = patients.map(p => ({ userId: p._id, userType: 'patient' }));
    } else if (normalizedTargetType === 'my_patients' && announcement.senderId) {
      const Appointment = require('../../models/Appointment');
      const appointments = await Appointment.find({ doctorId: announcement.senderId }).select('patientId');
      const patientIds = [...new Set(appointments.map(app => app.patientId.toString()))];
      const patients = await Patient.find({ _id: { $in: patientIds }, isActive: { $ne: false } }).select('_id');
      userIds = patients.map(p => ({ userId: p._id, userType: 'patient' }));
    } else if (normalizedTargetType === 'specific_patients' && Array.isArray(announcement.targetPatients) && announcement.targetPatients.length > 0) {
      userIds = announcement.targetPatients.map(id => ({ userId: id, userType: 'patient' }));
    } else {
      const [doctors, patients] = await Promise.all([
        Doctor.find({ isActive: { $ne: false } }).select('_id'),
        Patient.find({ isActive: { $ne: false } }).select('_id'),
      ]);
      userIds = [
        ...doctors.map(d => ({ userId: d._id, userType: 'doctor' })),
        ...patients.map(p => ({ userId: p._id, userType: 'patient' })),
      ];
    }

    if (userIds.length === 0) return;

    // Build notification documents
    const notificationDocs = userIds.map(({ userId, userType }) => ({
      userId,
      userType,
      type: 'announcement',
      title: announcement.title || 'New Announcement',
      message: announcement.content || 'You have a new announcement.',
      data: {
        announcementId: announcement._id.toString(),
        priority: announcement.priority || 'medium',
      },
      priority: announcement.priority === 'high' ? 'high' : 'medium',
      icon: announcement.image || null,
    }));

    // Perform bulk write for performance
    await Notification.insertMany(notificationDocs);
    console.log(`✅ Created ${notificationDocs.length} in-app announcement notifications in database`);
  } catch (error) {
    console.error('Failed to create in-app announcement notifications:', error.message);
  }
};

// @desc    Get all announcements (for admin moderation)
// @route   GET /api/admin/announcements
// @access  Private (Admin)
exports.getAllAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find()
    .populate('senderId', 'firstName lastName name email specialization profileImage')
    .sort({ sortOrder: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: announcements.length,
    data: announcements,
  });
});

// @desc    Create a global admin announcement
// @route   POST /api/admin/announcements
// @access  Private (Admin)
exports.createAdminAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, targetType, targetPatients, priority, expiryDate, image } = req.body;
  const { id: senderId } = req.auth;

  const announcement = await Announcement.create({
    title,
    content,
    senderId,
    senderRole: 'Admin',
    targetType: targetType || 'all',
    targetPatients,
    priority,
    expiryDate,
    image,
    approvalStatus: 'approved', // Admin announcements are auto-approved
  });

  // Real-time targeted announcement event
  try {
    const io = getIO();
    const payload = {
      announcement: {
        _id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        senderRole: announcement.senderRole,
        targetType: announcement.targetType,
        priority: announcement.priority,
        image: announcement.image || '',
        createdAt: announcement.createdAt,
      },
    };

    const normalizedTargetType = announcement.targetType || 'all';

    if (normalizedTargetType === 'doctors') {
      io.to('doctors').emit('announcement:new', payload);
    } else if (normalizedTargetType === 'patients') {
      io.to('patients').emit('announcement:new', payload);
    } else if (normalizedTargetType === 'specific_patients' && Array.isArray(announcement.targetPatients)) {
      announcement.targetPatients.forEach((patientId) => {
        io.to(`patient-${patientId.toString()}`).emit('announcement:new', payload);
      });
    } else {
      // both / all (and any fallback)
      io.to('doctors').emit('announcement:new', payload);
      io.to('patients').emit('announcement:new', payload);
    }
  } catch (socketError) {
    console.error('Failed to emit announcement:new socket event:', socketError.message);
  }

  // Fire-and-forget push notifications to target audience
  sendAnnouncementPushNotifications(announcement).catch((pushError) => {
    console.error('Announcement push notification error (non-critical):', pushError.message);
  });

  // Create persisted in-app notifications so they show up in user's bell icon/notification list
  createAnnouncementInAppNotifications(announcement).catch((inAppError) => {
    console.error('Announcement in-app notification error (non-critical):', inAppError.message);
  });

  res.status(201).json({
    success: true,
    data: announcement,
  });
});

// @desc    Update announcement status (Approve/Reject)
// @route   PATCH /api/admin/announcements/:id/status
// @access  Private (Admin)
exports.updateAnnouncementStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be approved or rejected',
    });
  }

  const announcement = await Announcement.findByIdAndUpdate(
    id,
    { approvalStatus: status },
    { new: true }
  );

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found',
    });
  }

  if (status === 'approved') {
    // Emit real-time socket event
    try {
      const io = getIO();
      const payload = {
        announcement: {
          _id: announcement._id,
          title: announcement.title,
          content: announcement.content,
          senderRole: announcement.senderRole,
          targetType: announcement.targetType,
          priority: announcement.priority,
          image: announcement.image || '',
          createdAt: announcement.createdAt,
        },
      };

      const normalizedTargetType = announcement.targetType || 'all';

      if (normalizedTargetType === 'doctors') {
        io.to('doctors').emit('announcement:new', payload);
      } else if (normalizedTargetType === 'patients') {
        io.to('patients').emit('announcement:new', payload);
      } else if (normalizedTargetType === 'specific_patients' && Array.isArray(announcement.targetPatients)) {
        announcement.targetPatients.forEach((patientId) => {
          io.to(`patient-${patientId.toString()}`).emit('announcement:new', payload);
        });
      } else {
        io.to('doctors').emit('announcement:new', payload);
        io.to('patients').emit('announcement:new', payload);
      }
    } catch (socketError) {
      console.error('Failed to emit announcement:new socket event on status update:', socketError.message);
    }

    sendAnnouncementPushNotifications(announcement).catch((pushError) => {
      console.error('Announcement push notification error on status update:', pushError.message);
    });

    createAnnouncementInAppNotifications(announcement).catch((inAppError) => {
      console.error('Announcement in-app notification error on status update:', inAppError.message);
    });
  }

  res.status(200).json({
    success: true,
    data: announcement,
  });
});

// @desc    Update any announcement
// @route   PATCH /api/admin/announcements/:id
// @access  Private (Admin)
exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await Announcement.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found',
    });
  }

  res.status(200).json({
    success: true,
    data: announcement,
  });
});

// @desc    Delete any announcement
// @route   DELETE /api/admin/announcements/:id
// @access  Private (Admin)
exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await Announcement.findByIdAndDelete(id);

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Announcement deleted successfully',
  });
});

// @desc    Get announcement metrics
// @route   GET /api/admin/announcements/metrics
// @access  Private (Admin)
exports.getAnnouncementMetrics = asyncHandler(async (req, res) => {
  const totalAnnouncements = await Announcement.countDocuments();
  const activeAnnouncements = await Announcement.countDocuments({ isActive: true });
  const pendingAnnouncements = await Announcement.countDocuments({ approvalStatus: 'pending' });
  const doctorAnnouncements = await Announcement.countDocuments({ senderRole: 'Doctor' });
  const adminAnnouncements = await Announcement.countDocuments({ senderRole: 'Admin' });
  const targetDoctors = await Announcement.countDocuments({ targetType: 'doctors' });
  const targetPatients = await Announcement.countDocuments({ targetType: 'patients' });
  const targetBoth = await Announcement.countDocuments({ targetType: { $in: ['both', 'all'] } });

  res.status(200).json({
    success: true,
    data: {
      totalAnnouncements,
      activeAnnouncements,
      pendingAnnouncements,
      doctorAnnouncements,
      adminAnnouncements,
      targetDoctors,
      targetPatients,
      targetBoth
    },
  });
});

// @desc    Reorder announcements
// @route   PATCH /api/admin/announcements/reorder
// @access  Private (Admin)
exports.updateAnnouncementsOrder = asyncHandler(async (req, res) => {
  const { orders } = req.body; // Array of { id, sortOrder }

  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({
      success: false,
      message: 'Orders array is required.',
    });
  }

  if (orders.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No announcements to reorder.',
    });
  }

  const bulkOps = orders
    .filter(item => item.id && item.sortOrder !== undefined)
    .map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { sortOrder: Number(item.sortOrder) } },
      },
    }));

  if (bulkOps.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid orders data provided.',
    });
  }

  try {
    await Announcement.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: 'Announcements reordered successfully.',
    });
  } catch (error) {
    console.error('Bulk reorder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder announcements. Some IDs might be invalid.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});
