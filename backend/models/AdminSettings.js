const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema(
  {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    autoVerifyDoctors: {
      type: Boolean,
      default: false,
    },
    requireTwoFactor: {
      type: Boolean,
      default: false,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      trim: true,
    },
    platformSettings: {
      name: { type: String, trim: true, default: 'Healway' },
      logo: { type: String, trim: true },
      primaryColor: { type: String, trim: true },
      secondaryColor: { type: String, trim: true },
      contactEmail: { type: String, trim: true },
      contactPhone: { type: String, trim: true },
      supportEmail: { type: String, trim: true },
    },
    paymentSettings: {
      razorpayKeyId: { type: String, trim: true },
      razorpayKeySecret: { type: String, trim: true },
      commissionRate: {
        doctor: { type: Number, default: 0.1 },
      },
    },
    notificationSettings: {
      appointmentReminder: { type: Boolean, default: true },
      paymentConfirmation: { type: Boolean, default: true },
      prescriptionReady: { type: Boolean, default: true },
    },
    legalContent: {
      termsOfService: { type: String, default: '' },
      privacyPolicy: { type: String, default: '' },
      lastUpdatedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure only one settings document exists
adminSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

module.exports = AdminSettings;

