const asyncHandler = require('../../middleware/asyncHandler');
const AdminSettings = require('../../models/AdminSettings');

// GET /api/admin/settings
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSettings.getSettings();

  return res.status(200).json({
    success: true,
    data: settings,
  });
});

// PATCH /api/admin/settings
exports.updateSettings = asyncHandler(async (req, res) => {
  const updateData = req.body;
  const settings = await AdminSettings.getSettings();

  // Handle nested object merges manually to ensure Mongoose detects changes
  if (updateData.platformSettings) {
    const freshPlatform = {
      ...(settings.platformSettings?.toObject?.() || settings.platformSettings || {}),
      ...updateData.platformSettings,
    };
    settings.platformSettings = freshPlatform;
    settings.markModified('platformSettings');
  }

  if (updateData.paymentSettings) {
    const freshPayment = {
      ...(settings.paymentSettings?.toObject?.() || settings.paymentSettings || {}),
      ...updateData.paymentSettings,
    };
    settings.paymentSettings = freshPayment;
    settings.markModified('paymentSettings');
  }

  if (updateData.notificationSettings) {
    const freshNotification = {
      ...(settings.notificationSettings?.toObject?.() || settings.notificationSettings || {}),
      ...updateData.notificationSettings,
    };
    settings.notificationSettings = freshNotification;
    settings.markModified('notificationSettings');
  }

  if (updateData.legalContent) {
    const freshLegal = {
      ...(settings.legalContent?.toObject?.() || settings.legalContent || {}),
      ...updateData.legalContent,
      lastUpdatedAt: new Date(),
    };
    settings.legalContent = freshLegal;
    settings.markModified('legalContent');
  }

  // Handle remaining top-level fields
  const handled = ['platformSettings', 'paymentSettings', 'notificationSettings', 'legalContent'];
  Object.keys(updateData).forEach(key => {
    if (!handled.includes(key)) {
      settings[key] = updateData[key];
    }
  });

  await settings.save();

  return res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: settings,
  });
});

// PATCH /api/admin/settings/commission
// Convenience endpoint to update doctor commission rate from the Admin Wallet UI
exports.updateCommissionRate = asyncHandler(async (req, res) => {
  const { doctorCommissionRate, commission, rate } = req.body || {};

  let input = doctorCommissionRate;
  if (input == null && commission != null) input = commission;
  if (input == null && rate != null) input = rate;

  const numeric = Number(input);

  if (!Number.isFinite(numeric)) {
    return res.status(400).json({
      success: false,
      message: 'Valid numeric commission rate is required',
    });
  }

  // Accept either decimal (0.1) or percentage (10) from clients
  let normalized = numeric;
  if (normalized <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Commission rate must be greater than 0',
    });
  }

  if (normalized > 1) {
    normalized = normalized / 100;
  }

  if (normalized >= 1) {
    return res.status(400).json({
      success: false,
      message: 'Commission rate must be less than 100%',
    });
  }

  const settings = await AdminSettings.getSettings();

  // Set value explicitly using nested path for better Mongoose tracking
  settings.set('paymentSettings.commissionRate.doctor', normalized);

  // Mark multiple levels as modified to be absolutely certain
  settings.markModified('paymentSettings');
  settings.markModified('paymentSettings.commissionRate');

  await settings.save();
  console.log(`✅ Doctor commission updated to: ${normalized * 100}% (Decimal: ${normalized})`);

  return res.status(200).json({
    success: true,
    message: 'Doctor commission rate updated successfully',
    data: {
      doctorCommissionRate: normalized,
    },
  });
});

