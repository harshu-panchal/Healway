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

