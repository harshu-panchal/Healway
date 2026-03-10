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
  const mergedData = {
    ...updateData,
  };

  if (updateData.platformSettings) {
    mergedData.platformSettings = {
      ...(settings.platformSettings?.toObject?.() || settings.platformSettings || {}),
      ...updateData.platformSettings,
    };
  }

  if (updateData.paymentSettings) {
    mergedData.paymentSettings = {
      ...(settings.paymentSettings?.toObject?.() || settings.paymentSettings || {}),
      ...updateData.paymentSettings,
    };
  }

  if (updateData.notificationSettings) {
    mergedData.notificationSettings = {
      ...(settings.notificationSettings?.toObject?.() || settings.notificationSettings || {}),
      ...updateData.notificationSettings,
    };
  }

  if (updateData.legalContent) {
    mergedData.legalContent = {
      ...(settings.legalContent?.toObject?.() || settings.legalContent || {}),
      ...updateData.legalContent,
      lastUpdatedAt: new Date(),
    };
  }

  Object.assign(settings, mergedData);
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
  settings.paymentSettings = settings.paymentSettings || {};
  settings.paymentSettings.commissionRate = settings.paymentSettings.commissionRate || {};
  settings.paymentSettings.commissionRate.doctor = normalized;
  await settings.save();

  return res.status(200).json({
    success: true,
    message: 'Doctor commission rate updated successfully',
    data: {
      doctorCommissionRate: normalized,
    },
  });
});

