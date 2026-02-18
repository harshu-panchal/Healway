const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { registerModel, ROLES } = require('../utils/getModelForRole');

const patientSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, minlength: 8 },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    bloodGroup: {
      type: String,
      trim: true,
      uppercase: true,
      enum: [
        'A+',
        'A-',
        'B+',
        'B-',
        'AB+',
        'AB-',
        'O+',
        'O-',
        'UNKNOWN',
      ],
      default: undefined,
    },
    profileImage: { type: String, trim: true },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relation: { type: String, trim: true },
    },
    medicalHistory: [
      {
        condition: { type: String, trim: true },
        notes: { type: String, trim: true },
        diagnosedAt: { type: Date },
      },
    ],
    allergies: [{ type: String, trim: true }],
    favorites: {
      doctors: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Doctor',
        },
      ],
    },
    walletBalance: { type: Number, default: 0, min: 0 }, // Wallet balance for refunds/credits
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    // FCM Push Notification Tokens
    fcmTokens: { type: [String], default: [] },       // Web browser tokens
    fcmTokenMobile: { type: [String], default: [] },  // Mobile app tokens
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

patientSchema.pre('save', async function encryptPassword(next) {
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

patientSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Patient = mongoose.model('Patient', patientSchema);

registerModel(ROLES.PATIENT, Patient);

module.exports = Patient;


