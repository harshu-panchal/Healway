const asyncHandler = require('../../middleware/asyncHandler');
const AdminSettings = require('../../models/AdminSettings');

const getNormalizedDocument = (document) => {
  if (document === 'terms') return 'terms';
  if (document === 'privacy') return 'privacy';
  if (document === 'contact-us') return 'contact-us';
  if (document === 'faq') return 'faq';
  if (document === 'help-center') return 'help-center';
  return null;
};

const getNormalizedRole = (role) => {
  if (role === 'doctor') return 'doctor';
  if (role === 'patient') return 'patient';
  return null;
};

const resolveContentByRoleAndDocument = (legalContent, role, document) => {
  if (document === 'terms') {
    if (role === 'doctor' && legalContent.doctorTermsOfService) return legalContent.doctorTermsOfService;
    if (role === 'patient' && legalContent.patientTermsOfService) return legalContent.patientTermsOfService;
    return legalContent.termsOfService || '';
  }

  if (document === 'privacy') {
    if (role === 'doctor' && legalContent.doctorPrivacyPolicy) return legalContent.doctorPrivacyPolicy;
    if (role === 'patient' && legalContent.patientPrivacyPolicy) return legalContent.patientPrivacyPolicy;
    return legalContent.privacyPolicy || '';
  }

  if (document === 'contact-us') return legalContent.contactUs || '';
  if (document === 'faq') return legalContent.faq || '';
  if (document === 'help-center') return legalContent.helpCenter || '';
  return '';
};

// GET /api/public/legal/:document
// GET /api/public/legal/:role/:document
exports.getLegalDocument = asyncHandler(async (req, res) => {
  const { document, role } = req.params;
  const settings = await AdminSettings.getSettings();
  const legalContent = settings.legalContent || {};

  const normalizedDocument = getNormalizedDocument(document);
  const normalizedRole = role ? getNormalizedRole(role) : null;

  if (!normalizedDocument) {
    return res.status(400).json({
      success: false,
      message: 'Invalid legal document type',
    });
  }

  if (role && !normalizedRole) {
    return res.status(400).json({
      success: false,
      message: 'Invalid legal role type',
    });
  }

  const content = resolveContentByRoleAndDocument(legalContent, normalizedRole, normalizedDocument);

  return res.status(200).json({
    success: true,
    data: {
      role: normalizedRole || 'common',
      document: normalizedDocument,
      content,
      lastUpdatedAt: legalContent.lastUpdatedAt || settings.updatedAt,
    },
  });
});
