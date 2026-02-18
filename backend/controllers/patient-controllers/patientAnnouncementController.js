const Announcement = require('../../models/Announcement');
const Appointment = require('../../models/Appointment');
const asyncHandler = require('../../middleware/asyncHandler');

// @desc    Get all announcements relevant to the patient
// @route   GET /api/patients/announcements
// @access  Private (Patient)
exports.getAnnouncements = asyncHandler(async (req, res) => {
  const { id: patientId } = req.auth;

  // 1. Get IDs of doctors the patient has appointments with
  const appointments = await Appointment.find({ patientId }).select('doctorId');
  const doctorIds = [...new Set(appointments.map(app => app.doctorId.toString()))];

  // 2. Find relevant announcements
  const announcements = await Announcement.find({
    isActive: true,
    approvalStatus: 'approved',
    $or: [
      { targetType: 'all' },
      { targetType: 'both' },
      { targetType: 'patients' },
      {
        targetType: 'my_patients',
        senderRole: 'Doctor',
        senderId: { $in: doctorIds }
      },
      {
        targetType: 'specific_patients',
        targetPatients: patientId
      }
    ],
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: new Date() } }
    ]
  })
    .populate('senderId', 'firstName lastName name specialization profileImage')
    .sort({ priority: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: announcements.length,
    data: announcements,
  });
});
