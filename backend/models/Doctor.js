const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { registerModel, ROLES } = require('../utils/getModelForRole');
const { APPROVAL_STATUS } = require('../utils/constants');

const doctorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, minlength: 8 },
    specialization: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    licenseNumber: { type: String, required: true, trim: true, unique: true },
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
          // Removed default - location is optional, only set if coordinates are provided
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
    // New structure: Global slots with day selection
    availabilitySlots: {
      inPerson: [{
        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
        isFree: { type: Boolean, default: false } // Ability to mark specific slot as free
      }],
      videoCall: [{
        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
        isFree: { type: Boolean, default: false }
      }],
      voiceCall: [{
        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
        isFree: { type: Boolean, default: false }
      }],
      // Keep backward compatibility field for now, but aim to migrate
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
    // Keep old structure for backward compatibility
    availability: [
      {
        day: { type: String, trim: true },
        // Support new structure with slots array
        slots: [
          {
            consultationType: {
              type: String,
              enum: ['in_person', 'video_call', 'voice_call', 'call_video'], // call_video for backward compatibility
              default: 'in_person',
              trim: true
            },
            startTime: { type: String, trim: true },
            endTime: { type: String, trim: true },
            isFree: { type: Boolean, default: false }
          },
        ],
        // Keep old structure for backward compatibility
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
    // Daily slots for specific dates with multiple consultation types
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
            isFree: { type: Boolean, default: false }, // Marks if slot is intentionally kept free
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
    isFeatured: {
      type: Boolean,
      default: false,
    },
    rejectionReason: { type: String, trim: true },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
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
    // FCM Push Notification Tokens
    fcmTokens: { type: [String], default: [] },       // Web browser tokens
    fcmTokenMobile: { type: [String], default: [] },  // Mobile app tokens
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

// Pre-save hook to remove unwanted fields
doctorSchema.pre('save', function removeUnwantedFields(next) {
  // Remove rating field if it exists (not part of our schema)
  if (this.rating !== undefined) {
    this.rating = undefined;
  }

  // Remove availableTimings field if it exists (deprecated)
  if (this.availableTimings !== undefined) {
    this.availableTimings = undefined;
  }

  next();
});

// Pre-save hook to calculate fees
doctorSchema.pre('save', function calculateFees(next) {
  // Ensure fees object exists
  if (!this.fees) {
    this.fees = {};
  }

  // Calculate final fees for each mode
  if (this.fees.inPerson) {
    this.fees.inPerson.final = Math.max(0, (this.fees.inPerson.original || 0) - (this.fees.inPerson.discount || 0));

    // Calculate confirm slot amount from percentage
    const confirmSlotPercentage = this.fees.inPerson.confirmSlotPercentage || 0;
    this.fees.inPerson.confirmSlotAmount = Math.round((this.fees.inPerson.final * confirmSlotPercentage) / 100);

    // Ensure selectedDays array exists
    if (!Array.isArray(this.fees.inPerson.selectedDays)) {
      this.fees.inPerson.selectedDays = [];
    }

    // Backward compatibility: sync inPerson fees with top-level fields
    this.original_fees = this.fees.inPerson.original;
    this.discount_amount = this.fees.inPerson.discount;
    this.consultationFee = this.fees.inPerson.final;
  }

  if (this.fees.videoCall) {
    this.fees.videoCall.final = Math.max(0, (this.fees.videoCall.original || 0) - (this.fees.videoCall.discount || 0));

    // Ensure selectedDays array exists
    if (!Array.isArray(this.fees.videoCall.selectedDays)) {
      this.fees.videoCall.selectedDays = [];
    }
  }

  if (this.fees.voiceCall) {
    this.fees.voiceCall.final = Math.max(0, (this.fees.voiceCall.original || 0) - (this.fees.voiceCall.discount || 0));

    // Ensure selectedDays array exists
    if (!Array.isArray(this.fees.voiceCall.selectedDays)) {
      this.fees.voiceCall.selectedDays = [];
    }
  }

  // If fees object is being updated but individual modes are not set, initialize them
  if (this.isModified('fees') && this.fees) {
    if (!this.fees.inPerson) {
      this.fees.inPerson = { original: 0, discount: 0, final: 0, confirmSlotPercentage: 0, confirmSlotAmount: 0, selectedDays: [] };
    }
    if (!this.fees.videoCall) {
      this.fees.videoCall = { original: 0, discount: 0, final: 0, selectedDays: [] };
    }
    if (!this.fees.voiceCall) {
      this.fees.voiceCall = { original: 0, discount: 0, final: 0, selectedDays: [] };
    }
  }

  // Fallback for old style updates (if fees object doesn't exist but old fields are modified)
  if ((this.isModified('original_fees') || this.isModified('discount_amount')) && (!this.fees || !this.fees.inPerson)) {
    this.consultationFee = Math.max(0, (this.original_fees || 0) - (this.discount_amount || 0));

    // Sync back to fees object
    this.fees = this.fees || {};
    this.fees.inPerson = this.fees.inPerson || {};
    this.fees.inPerson.original = this.original_fees;
    this.fees.inPerson.discount = this.discount_amount;
    this.fees.inPerson.final = this.consultationFee;
    this.fees.inPerson.confirmSlotPercentage = this.fees.inPerson.confirmSlotPercentage || 0;
    this.fees.inPerson.confirmSlotAmount = Math.round((this.consultationFee * (this.fees.inPerson.confirmSlotPercentage || 0)) / 100);
    this.fees.inPerson.selectedDays = this.fees.inPerson.selectedDays || [];
  }

  next();
});

// Pre-save hook to remove invalid location objects (with only type but no coordinates)
doctorSchema.pre('save', function removeInvalidLocation(next) {
  if (this.clinicDetails && this.clinicDetails.location) {
    const loc = this.clinicDetails.location;
    if (!loc.coordinates ||
      !Array.isArray(loc.coordinates) ||
      loc.coordinates.length !== 2 ||
      !Number.isFinite(loc.coordinates[0]) ||
      !Number.isFinite(loc.coordinates[1])) {
      // Remove invalid location
      this.clinicDetails.location = undefined;
      if (this.clinicDetails.locationSource) {
        this.clinicDetails.locationSource = undefined;
      }
    }
  }
  next();
});

// Pre-save hook to validate average consultation time for Call/Video modes
doctorSchema.pre('save', function validateConsultationTime(next) {
  const modes = this.consultationModes || [];
  const needsTime = modes.some(m => ['call', 'video_call', 'call_video', 'voice_call', 'VIDEO_CALL', 'CALL'].includes(m));

  if (needsTime) {
    if (!this.averageConsultationMinutes || this.averageConsultationMinutes < 5) {
      // Set default if not provided, or it could be an error
      this.averageConsultationMinutes = 20;
    }

    // Ensure availabilitySlots exist if they are being used
    if (this.availabilitySlots) {
      // logic to ensure structures are valid can go here if stricter validation is needed
    }
  }
  next();
});

doctorSchema.pre('save', async function encryptPassword(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
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


