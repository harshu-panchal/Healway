const Announcement = require('../../models/Announcement');
const asyncHandler = require('../../middleware/asyncHandler');

// @desc    Get all announcements (for admin moderation)
// @route   GET /api/admin/announcements
// @access  Private (Admin)
exports.getAllAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find()
    .populate('senderId', 'firstName lastName name email specialization profileImage')
    .sort({ createdAt: -1 });

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
