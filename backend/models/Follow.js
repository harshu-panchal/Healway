const mongoose = require('mongoose');

const followSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicate follows
followSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });
followSchema.index({ doctorId: 1, createdAt: -1 });
followSchema.index({ doctorId: 1 });
followSchema.index({ patientId: 1 });

const Follow = mongoose.model('Follow', followSchema);
module.exports = Follow;
