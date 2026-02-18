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

  let settings = await AdminSettings.findOne();
  if (!settings) {
    settings = await AdminSettings.create(updateData);
  } else {
    Object.assign(settings, updateData);
    await settings.save();
  }

  return res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: settings,
  });
});

