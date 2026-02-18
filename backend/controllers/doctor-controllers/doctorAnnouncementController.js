const Announcement = require('../../models/Announcement');
const asyncHandler = require('../../middleware/asyncHandler');

// @desc    Create a new announcement
// @route   POST /api/doctors/announcements
// @access  Private (Doctor)
exports.createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, targetType, targetPatients, priority, expiryDate, image } = req.body;
  const { id: senderId } = req.auth;

  const announcement = await Announcement.create({
    title,
    content,
    senderId,
    senderRole: 'Doctor',
    targetType: targetType || 'my_patients',
    targetPatients,
    priority,
    expiryDate,
    image,
    approvalStatus: 'pending', // Doctors announcements need approval
  });

  res.status(201).json({
    success: true,
    data: announcement,
  });
});

// @desc    Get all announcements by current doctor
// @route   GET /api/doctors/announcements
// @access  Private (Doctor)
exports.getMyAnnouncements = asyncHandler(async (req, res) => {
  const { id: senderId } = req.auth;

  const announcements = await Announcement.find({
    $or: [
      { senderId, senderRole: 'Doctor' },
      {
        senderRole: 'Admin',
        isActive: true,
        approvalStatus: 'approved',
        targetType: { $in: ['all', 'both', 'doctors'] },
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: new Date() } }
        ]
      }
    ]
  })
    .populate('senderId', 'firstName lastName name profileImage')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: announcements.length,
    data: announcements,
  });
});

// @desc    Update an announcement
// @route   PATCH /api/doctors/announcements/:id
// @access  Private (Doctor)
exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: senderId } = req.auth;

  let announcement = await Announcement.findOne({ _id: id, senderId });

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found or not authorized',
    });
  }

  announcement = await Announcement.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: announcement,
  });
});

// @desc    Delete an announcement
// @route   DELETE /api/doctors/announcements/:id
// @access  Private (Doctor)
exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: senderId } = req.auth;

  const announcement = await Announcement.findOne({ _id: id, senderId });

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found or not authorized',
    });
  }

  await Announcement.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Announcement deleted successfully',
  });
});
