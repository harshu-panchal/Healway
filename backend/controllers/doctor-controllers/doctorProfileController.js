const asyncHandler = require('../../middleware/asyncHandler');
const { getProfileByRoleAndId, updateProfileByRoleAndId } = require('../../services/profileService');
const { ROLES } = require('../../utils/constants');

// GET /api/doctors/auth/me
exports.getDoctorProfile = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const profile = await getProfileByRoleAndId(ROLES.DOCTOR, id);

  return res.status(200).json({
    success: true,
    data: profile,
  });
});

// PATCH /api/doctors/auth/me
exports.updateDoctorProfile = asyncHandler(async (req, res) => {
  const { id } = req.auth;
  const updateData = req.body;

  const updatedProfile = await updateProfileByRoleAndId(ROLES.DOCTOR, id, updateData);

  // Cache invalidation removed (Redis removed)

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile,
  });
});

