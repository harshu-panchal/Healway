const asyncHandler = require('../../middleware/asyncHandler');
const AdminSettings = require('../../models/AdminSettings');

// GET /api/public/legal/:document
exports.getLegalDocument = asyncHandler(async (req, res) => {
  const { document } = req.params;
  const settings = await AdminSettings.getSettings();
  const legalContent = settings.legalContent || {};

  const normalizedDocument = document === 'terms' ? 'terms' : document === 'privacy' ? 'privacy' : null;

  if (!normalizedDocument) {
    return res.status(400).json({
      success: false,
      message: 'Invalid legal document type',
    });
  }

  const content =
    normalizedDocument === 'terms'
      ? legalContent.termsOfService || ''
      : legalContent.privacyPolicy || '';

  return res.status(200).json({
    success: true,
    data: {
      document: normalizedDocument,
      content,
      lastUpdatedAt: legalContent.lastUpdatedAt || settings.updatedAt,
    },
  });
});

