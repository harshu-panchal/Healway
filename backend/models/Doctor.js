const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { registerModel, ROLES } = require('../utils/getModelForRole');
const { APPROVAL_STATUS, DOCTOR_ACCESS_MODES } = require('../utils/constants');

const doctorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, minlength: 8 },
    specialization: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    licenseNumber: { type: String, trim: true, unique: true, sparse: true },
    experienceYears: { type: Number, min: 0 },
    education: [{ institution: String, degree: String, year: Number }],
    qualification: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
    services: [{ type: String, trim: true }],
    isDoctor: { type: Boolean, default: true },
    consultationModes: [{ type: String, enum: ['in_person', 'video_call', 'voice_call', 'chat', 'call'] }],
    clinicDetails: {
      images: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        }
      ],
      name: { type: String, trim: true },
      address: {
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, trim: true },
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number],
          validate: {
            validator(value) {
              return Array.isArray(value) && value.length === 2;
            },
            message: 'Clinic location coordinates must be [lng, lat].',
          },
        },
      },
      locationSource: {
        type: String,
        enum: ['manual', 'gps'],
      },
    },
    bio: { type: String, trim: true },
    fees: {
      inPerson: {
        original: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        final: { type: Number, default: 0 },
        codEnabled: { type: Boolean, default: false },
        confirmSlotPercentage: { type: Number, min: 0, max: 100, default: 0 },
        confirmSlotAmount: { type: Number, default: 0 },
        selectedDays: [{
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          trim: true
        }]
      },
      videoCall: {
        original: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        final: { type: Number, default: 0 },
        selectedDays: [{
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          trim: true
        }]
      },
      voiceCall: {
        original: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        final: { type: Number, default: 0 },
        selectedDays: [{
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          trim: true
        }]
      }
    },
    // Keep for backward compatibility
    original_fees: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount_amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    averageConsultationMinutes: {
      type: Number,
      min: 5,
      max: 120,
      default: 20, // Default 20 minutes per consultation
    },
    // Updated structure: Day-specific slots within each consultation mode
    availabilitySlots: {
      inPerson: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], trim: true },
        slots: [{
          startTime: { type: String, trim: true },
          endTime: { type: String, trim: true },
          isFree: { type: Boolean, default: false }
        }]
      }],
      videoCall: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], trim: true },
        slots: [{
          startTime: { type: String, trim: true },
          endTime: { type: String, trim: true },
          isFree: { type: Boolean, default: false }
        }]
      }],
      voiceCall: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], trim: true },
        slots: [{
          startTime: { type: String, trim: true },
          endTime: { type: String, trim: true },
          isFree: { type: Boolean, default: false }
        }]
      }],
      // Keep these for tracking selected days at a high level or for backward compatibility
      inPersonSelectedDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], trim: true }],
      videoCallSelectedDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], trim: true }],
      voiceCallSelectedDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], trim: true }],
      // Backward compatibility fields
      callVideo: {
        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
      },
      selectedDays: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        trim: true
      }],
    },
    availability: [
      {
        day: { type: String, trim: true },
        slots: [
          {
            consultationType: {
              type: String,
              enum: ['in_person', 'video_call', 'voice_call', 'call_video'],
              default: 'in_person',
              trim: true
            },
            startTime: { type: String, trim: true },
            endTime: { type: String, trim: true },
            isFree: { type: Boolean, default: false }
          },
        ],
        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
      },
    ],
    blockedDates: [
      {
        date: { type: Date, required: true },
        reason: { type: String, trim: true, enum: ['holiday', 'leave', 'emergency', 'other'], default: 'other' },
        description: { type: String, trim: true },
        isRecurring: { type: Boolean, default: false },
        recurringPattern: {
          type: { type: String, enum: ['yearly', 'monthly', 'weekly'], trim: true },
          dayOfMonth: { type: Number, min: 1, max: 31 },
          month: { type: Number, min: 1, max: 12 },
          dayOfWeek: { type: Number, min: 0, max: 6 },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    breakTimes: [
      {
        day: { type: String, trim: true },
        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
        isRecurring: { type: Boolean, default: true },
        specificDate: { type: Date },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    temporaryAvailability: [
      {
        date: { type: Date, required: true },
        slots: [
          {
            startTime: { type: String, trim: true, required: true },
            endTime: { type: String, trim: true, required: true },
          },
        ],
        reason: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    dailySlots: [
      {
        date: { type: Date, required: true },
        slots: [
          {
            consultationType: {
              type: String,
              enum: ['in_person', 'video_call', 'voice_call'],
              required: true,
              trim: true
            },
            startTime: { type: String, trim: true, required: true },
            endTime: { type: String, trim: true, required: true },
            isFree: { type: Boolean, default: false },
          },
        ],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    profileImage: { type: String, trim: true },
    digitalSignature: {
      imageUrl: { type: String, trim: true },
      uploadedAt: { type: Date },
    },
    documents: [{
      name: { type: String, required: true, trim: true },
      fileUrl: { type: String, required: true, trim: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
    status: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    accessMode: {
      type: String,
      enum: Object.values(DOCTOR_ACCESS_MODES),
      default: DOCTOR_ACCESS_MODES.ACTIVE,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    rejectionReason: { type: String, trim: true },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    authRevokedAt: { type: Date },
    lastLoginAt: { type: Date },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      types: {
        appointment: { type: Boolean, default: true },
        consultation: { type: Boolean, default: true },
        prescription: { type: Boolean, default: true },
        payment: { type: Boolean, default: true },
        system: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: '22:00' },
        endTime: { type: String, default: '08:00' },
      },
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    fcmTokens: { type: [String], default: [] },
    fcmTokenMobile: { type: [String], default: [] },
    withdrawalMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'cash', 'none'],
      default: 'none',
    },
    withdrawalDetails: {
      bank: {
        accountNumber: { type: String, trim: true },
        ifscCode: { type: String, trim: true },
        bankName: { type: String, trim: true },
        accountHolderName: { type: String, trim: true },
      },
      upi: {
        upiId: { type: String, trim: true },
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

doctorSchema.pre('save', function removeUnwantedFields(next) {
  if (this.rating !== undefined) this.rating = undefined;
  if (this.availableTimings !== undefined) this.availableTimings = undefined;
  next();
});

doctorSchema.pre('save', function calculateFees(next) {
  if (!this.fees) this.fees = {};
  if (this.fees.inPerson) {
    this.fees.inPerson.final = Math.max(0, (this.fees.inPerson.original || 0) - (this.fees.inPerson.discount || 0));
    const confirmSlotPercentage = this.fees.inPerson.confirmSlotPercentage || 0;
    this.fees.inPerson.confirmSlotAmount = Math.round((this.fees.inPerson.final * confirmSlotPercentage) / 100);
    if (!Array.isArray(this.fees.inPerson.selectedDays)) this.fees.inPerson.selectedDays = [];
    this.original_fees = this.fees.inPerson.original;
    this.discount_amount = this.fees.inPerson.discount;
    this.consultationFee = this.fees.inPerson.final;
  }
  if (this.fees.videoCall) {
    this.fees.videoCall.final = Math.max(0, (this.fees.videoCall.original || 0) - (this.fees.videoCall.discount || 0));
    if (!Array.isArray(this.fees.videoCall.selectedDays)) this.fees.videoCall.selectedDays = [];
  }
  if (this.fees.voiceCall) {
    this.fees.voiceCall.final = Math.max(0, (this.fees.voiceCall.original || 0) - (this.fees.voiceCall.discount || 0));
    if (!Array.isArray(this.fees.voiceCall.selectedDays)) this.fees.voiceCall.selectedDays = [];
  }
  next();
});

doctorSchema.pre('save', function removeInvalidLocation(next) {
  if (this.clinicDetails && this.clinicDetails.location) {
    const loc = this.clinicDetails.location;
    if (!loc.coordinates || !Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) {
      this.clinicDetails.location = undefined;
      this.clinicDetails.locationSource = undefined;
    }
  }
  next();
});

doctorSchema.pre('save', function validateConsultationTime(next) {
  const modes = this.consultationModes || [];
  const needsTime = modes.some(m => ['call', 'video_call', 'call_video', 'voice_call'].includes(m));
  if (needsTime && (!this.averageConsultationMinutes || this.averageConsultationMinutes < 5)) {
    this.averageConsultationMinutes = 20;
  }
  next();
});

doctorSchema.pre('save', function syncAccessMode(next) {
  if (this.accessMode === DOCTOR_ACCESS_MODES.HIDDEN) {
    this.isActive = false;
  } else if (this.accessMode === DOCTOR_ACCESS_MODES.ACTIVE || this.accessMode === DOCTOR_ACCESS_MODES.VISIBLE_UNBOOKABLE) {
    this.isActive = true;
  }
  next();
});

doctorSchema.pre('save', async function encryptPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

doctorSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

doctorSchema.index({ specialization: 1, status: 1 });
doctorSchema.index({ status: 1, isActive: 1, sortOrder: 1 });
doctorSchema.index({ 'clinicDetails.location': '2dsphere' });
doctorSchema.index({ sortOrder: 1 });
doctorSchema.index({ createdAt: -1 });

const Doctor = mongoose.model('Doctor', doctorSchema);
registerModel(ROLES.DOCTOR, Doctor);
module.exports = Doctor;
