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
      patientTermsOfService: { type: String, default: '' },
      patientPrivacyPolicy: { type: String, default: '' },
      doctorTermsOfService: { type: String, default: '' },
      doctorPrivacyPolicy: { type: String, default: '' },
      contactUs: { type: String, default: '' },
      faq: { type: String, default: '' },
      helpCenter: { type: String, default: '' },
      lastUpdatedAt: { type: Date },
    },
    footerSettings: {
      brandImage: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
      supportPhone: { type: String, trim: true, default: '' },
      supportEmail: { type: String, trim: true, default: '' },
      whatsappNumber: { type: String, trim: true, default: '' },
      facebookUrl: { type: String, trim: true, default: '' },
      twitterUrl: { type: String, trim: true, default: '' },
      linkedinUrl: { type: String, trim: true, default: '' },
      instagramUrl: { type: String, trim: true, default: '' },
      youtubeUrl: { type: String, trim: true, default: '' },
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
  // Always get the first document to avoid issues with multiple settings docs
  let settings = await this.findOne().sort({ createdAt: 1 });

  if (!settings) {
    settings = await this.create({});
  } else {
    // If we have more than one, clean up others to avoid non-deterministic behavior
    // This is a self-healing measure to ensure only ONE settings record exists
    const count = await this.countDocuments();
    if (count > 1) {
      await this.deleteMany({ _id: { $ne: settings._id } });
    }
  }
  return settings;
};

// Helper: Get doctor commission rate as decimal (e.g. 0.1 for 10%)
// Falls back to 10% if not configured or invalid, without using environment variables.
adminSettingsSchema.statics.getDoctorCommissionRate = async function () {
  const settings = await this.getSettings();

  const rawRate =
    settings.paymentSettings &&
    settings.paymentSettings.commissionRate &&
    settings.paymentSettings.commissionRate.doctor;

  let rate = Number(rawRate);

  // If not set or invalid, default to 10%
  if (!Number.isFinite(rate) || rate <= 0) {
    rate = 0.1;
  }

  // If someone stored percentage (e.g. 10 instead of 0.1), normalize it
  if (rate > 1) {
    rate = rate / 100;
  }

  return rate;
};

const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

module.exports = AdminSettings;


