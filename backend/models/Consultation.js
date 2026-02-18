const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    consultationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed', 'cancelled'],
      default: 'in-progress',
      index: true,
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    symptoms: {
      type: String,
      trim: true,
    },
    vitals: {
      bloodPressure: {
        systolic: { type: String, trim: true },
        diastolic: { type: String, trim: true },
      },
      temperature: { type: String, trim: true },
      pulse: { type: String, trim: true }, // Also support 'pulse' field name
      heartRate: { type: String, trim: true }, // Keep for backward compatibility
      respiratoryRate: { type: String, trim: true },
      oxygenSaturation: { type: String, trim: true }, // Also support 'oxygenSaturation' field name
      spo2: { type: String, trim: true }, // Keep for backward compatibility
      weight: { type: String, trim: true },
      height: { type: String, trim: true },
      bmi: { type: String, trim: true },
    },
    investigations: [
      {
        testName: { type: String, trim: true, required: true },
        notes: { type: String, trim: true },
      },
    ],
    advice: {
      type: String,
      trim: true,
    },
    followUpDate: {
      type: Date,
    },
    attachments: [
      {
        type: { type: String, trim: true },
        url: { type: String, trim: true, required: true },
        name: { type: String, trim: true },
      },
    ],
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
consultationSchema.index({ doctorId: 1, consultationDate: -1 });
consultationSchema.index({ patientId: 1, consultationDate: -1 });

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation;

