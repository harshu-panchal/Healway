const asyncHandler = require('../../middleware/asyncHandler');
const AdminSettings = require('../../models/AdminSettings');

const defaultFooterSettings = {
  brandImage: '',
  description: '',
  supportPhone: '',
  supportEmail: '',
  whatsappNumber: '',
  facebookUrl: '',
  twitterUrl: '',
  linkedinUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
  lastUpdatedAt: null,
};

// GET /api/public/settings/footer
exports.getFooterSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSettings.getSettings();

  return res.status(200).json({
    success: true,
    data: {
      ...defaultFooterSettings,
      ...(settings.footerSettings?.toObject?.() || settings.footerSettings || {}),
    },
  });
});
