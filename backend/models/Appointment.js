const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
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
    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },
    time: {
      type: String,
      required: true,
    },
    appointmentType: {
      type: String,
      enum: ['New', 'Follow-up'],
      default: 'New',
    },
    consultationMode: {
      type: String,
      enum: ['in_person', 'video_call', 'call', 'IN_PERSON', 'VIDEO', 'CALL'], // Support both old and new formats
      default: 'in_person',
    },
    // Patient Details (for 'Someone Else' booking)
    patientType: {
      type: String,
      enum: ['Self', 'Else'],
      default: 'Self',
    },
    patientName: {
      type: String,
      trim: true,
    },
    patientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    patientPhone: {
      type: String,
      trim: true,
    },
    patientAge: {
      type: Number,
      min: 0,
      max: 120,
    },
    patientGender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    // New fields for consultation logic
    expectedTime: {
      type: Date,
      // Only for CALL/VIDEO - approximate expected consultation time
    },
    clinicStartTime: {
      type: String,
      trim: true,
      // Only for IN_PERSON - doctor's clinic availability start time
    },
    clinicEndTime: {
      type: String,
      trim: true,
      // Only for IN_PERSON - doctor's clinic availability end time
    },
    averageConsultationTime: {
      type: Number,
      min: 0,
      // Only for CALL/VIDEO - used to calculate expectedTime
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'pending_payment'],
      default: 'scheduled',
    },
    reason: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
      default: 30, // minutes
    },
    fee: {
      type: Number,
      min: 0,
    },
    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'refunded', 'free'],
      default: 'pending',
    },
    paymentId: {
      type: String,
      trim: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
    tokenNumber: {
      type: Number,
      min: 1,
      // Only for CALL/VIDEO - null for IN_PERSON
    },
    queueStatus: {
      type: String,
      enum: ['no-show', 'completed', 'cancelled'],
      default: 'completed',
    },
    recallCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin', 'system'],
      trim: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    rescheduledAt: {
      type: Date,
    },
    rescheduledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
    },
    rescheduleReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    refundAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      trim: true,
    },
    refundedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Pre-save validation hook to enforce consultation type rules
appointmentSchema.pre('save', function (next) {
  // Normalize consultation mode
  const mode = this.consultationMode?.toUpperCase();
  const isInPerson = mode === 'IN_PERSON' || mode === 'INPERSON';
  const isCallOrVideo = mode === 'CALL' || mode === 'VIDEO' || mode === 'VIDEO_CALL' || mode === 'VOICE_CALL';

  // For IN_PERSON: Enforce strict rules
  if (isInPerson) {
    // Must NOT have token, expectedTime, or averageConsultationTime
    if (this.tokenNumber !== null && this.tokenNumber !== undefined) {
      this.tokenNumber = null;
    }
    if (this.expectedTime !== null && this.expectedTime !== undefined) {
      this.expectedTime = null;
    }
    if (this.averageConsultationTime !== null && this.averageConsultationTime !== undefined) {
      this.averageConsultationTime = null;
    }
    // Must have clinic times (if payment is completed)
    // Note: clinic times may be null during booking, that's okay
  }

  // For CALL/VIDEO: After payment, must have token and expectedTime
  // (Before payment, these can be null)
  if (isCallOrVideo && this.paymentStatus === 'paid') {
    // If payment is completed, token and expectedTime should be set
    // But we don't enforce here as they're set in payment verification
    // This is just for data cleanup
    if (this.averageConsultationTime === null || this.averageConsultationTime === undefined) {
      // Keep it null if not set - will be handled by payment verification
    }
    // Clear clinic times if they exist
    if (this.clinicStartTime !== null && this.clinicStartTime !== undefined) {
      this.clinicStartTime = null;
    }
    if (this.clinicEndTime !== null && this.clinicEndTime !== undefined) {
      this.clinicEndTime = null;
    }
  }

  next();
});

// Indexes for efficient queries
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ razorpayOrderId: 1 });
appointmentSchema.index({ paymentId: 1 });
appointmentSchema.index({ doctorId: 1 });
appointmentSchema.index({ patientId: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;

