const asyncHandler = require('../../middleware/asyncHandler');
const Patient = require('../../models/Patient');
const { getProfileByRoleAndId, updateProfileByRoleAndId } = require('../../services/profileService');
const { ROLES } = require('../../utils/constants');

// GET /api/patients/auth/me
exports.getPatientProfile = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const profile = await getProfileByRoleAndId(ROLES.PATIENT, id);

  return res.status(200).json({
    success: true,
    data: profile,
  });
});

// PUT /api/patients/auth/me
exports.updatePatientProfile = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const updateData = req.body;

  const updatedProfile = await updateProfileByRoleAndId(ROLES.PATIENT, id, updateData);

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile,
  });
});

