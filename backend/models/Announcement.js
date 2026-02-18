const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'senderRole',
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['Doctor', 'Admin'],
    },
    targetType: {
      type: String,
      enum: ['all', 'doctors', 'patients', 'both', 'specific_patients', 'my_patients'],
      default: 'all',
    },
    targetPatients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // Admin posts are auto-approved, overridden for doctors in controller
    },
    expiryDate: {
      type: Date,
    },
    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for faster queries
announcementSchema.index({ senderId: 1, createdAt: -1 });
announcementSchema.index({ targetType: 1 });
announcementSchema.index({ isActive: 1 });
announcementSchema.index({ approvalStatus: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
