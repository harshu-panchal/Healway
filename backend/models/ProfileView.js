const mongoose = require('mongoose');

const profileViewSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: false, // Optional for guest views
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

profileViewSchema.index({ doctorId: 1, createdAt: -1 });
profileViewSchema.index({ ipAddress: 1, doctorId: 1, createdAt: -1 });
profileViewSchema.index({ viewerId: 1, doctorId: 1, createdAt: -1 });

const ProfileView = mongoose.model('ProfileView', profileViewSchema);
module.exports = ProfileView;
