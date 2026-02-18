const Admin = require('../../models/Admin');
const asyncHandler = require('../../middleware/asyncHandler');
const { createAccessToken, createRefreshToken, verifyRefreshToken, blacklistToken, decodeToken } = require('../../utils/tokenService');
const {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} = require('../../services/passwordResetService');
const { getProfileByRoleAndId, updateProfileByRoleAndId } = require('../../services/profileService');
const { ROLES } = require('../../utils/constants');

const buildAuthResponse = (admin) => {
  const payload = { id: admin._id, role: ROLES.ADMIN, isSuperAdmin: admin.isSuperAdmin };
  return {
    accessToken: createAccessToken(payload),
    refreshToken: createRefreshToken(payload),
  };
};

exports.loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  // Email format validation
  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  // Password length validation
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const admin = await Admin.findOne({ email: trimmedEmail });

  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const isMatch = await admin.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  if (!admin.isActive) {
    return res.status(403).json({ success: false, message: 'Admin account is disabled.' });
  }

  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });

  const tokens = buildAuthResponse(admin);

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: {
      admin,
      tokens,
    },
  });
});

exports.getAdminProfile = asyncHandler(async (req, res) => {
  const admin = await getProfileByRoleAndId(ROLES.ADMIN, req.auth.id);

  return res.status(200).json({ success: true, data: admin });
});

exports.updateAdminProfile = asyncHandler(async (req, res) => {
  const updates = { ...req.body };

  if (updates.phone && typeof updates.phone !== 'string') {
    updates.phone = String(updates.phone);
  }

  const admin = await updateProfileByRoleAndId(ROLES.ADMIN, req.auth.id, updates, { requester: req.user });

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: admin,
  });
});

exports.updateAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password is required.',
    });
  }

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password is required.',
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 8 characters long.',
    });
  }

  if (newPassword.length > 128) {
    return res.status(400).json({
      success: false,
      message: 'New password must not exceed 128 characters.',
    });
  }

  // Password strength validation
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return res.status(400).json({
      success: false,
      message: 'New password must contain at least one uppercase letter, one lowercase letter, and one number.',
    });
  }

  const admin = await Admin.findById(req.auth.id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found.',
    });
  }

  // Verify current password
  const isCurrentPasswordValid = await admin.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect.',
    });
  }

  // Update password
  admin.password = newPassword;
  await admin.save();

  return res.status(200).json({
    success: true,
    message: 'Password updated successfully.',
  });
});

exports.logoutAdmin = asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  if (accessToken) {
    try {
      const decoded = decodeToken(accessToken);
      if (decoded && decoded.id && decoded.role) {
        await blacklistToken(accessToken, 'access', decoded.id, decoded.role, 'logout');
      }
    } catch (error) {
      console.log('Error blacklisting access token:', error.message);
    }
  }

  if (refreshToken) {
    try {
      const decoded = decodeToken(refreshToken);
      if (decoded && decoded.id && decoded.role) {
        await blacklistToken(refreshToken, 'refresh', decoded.id, decoded.role, 'logout');
      }
    } catch (error) {
      console.log('Error blacklisting refresh token:', error.message);
    }
  }

  res.clearCookie('token');
  res.clearCookie('refreshToken');
  return res.status(200).json({ success: true, message: 'Logout successful. All tokens have been revoked.' });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required.',
    });
  }

  try {
    const decoded = await verifyRefreshToken(refreshToken);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (Object.prototype.hasOwnProperty.call(admin, 'isActive') && admin.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive.',
      });
    }

    try {
      await blacklistToken(refreshToken, 'refresh', decoded.id, decoded.role, 'refresh');
    } catch (error) {
      console.log('Error blacklisting old refresh token:', error.message);
    }

    const payload = { id: admin._id, role: ROLES.ADMIN, isSuperAdmin: admin.isSuperAdmin };
    const newAccessToken = createAccessToken(payload);
    const newRefreshToken = createRefreshToken(payload);

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired. Please login again.',
      });
    }
    if (error.name === 'TokenRevokedError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked. Please login again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token. Please login again.',
      });
    }
    throw error;
  }
});

exports.getAdminById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requester = req.user;
  const requesterId = String(req.auth.id);

  if (requesterId !== String(id) && !requester.isSuperAdmin) {
    const error = new Error('Only super admins can view other admin profiles.');
    error.status = 403;
    throw error;
  }

  const admin = await getProfileByRoleAndId(ROLES.ADMIN, id);

  return res.status(200).json({ success: true, data: admin });
});

exports.adminForgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const result = await requestPasswordReset({ role: ROLES.ADMIN, email });

  return res.status(200).json({ success: true, message: result.message });
});

exports.adminVerifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
  }

  const result = await verifyPasswordResetOtp({ role: ROLES.ADMIN, email, otp });

  return res.status(200).json({
    success: true,
    message: result.message,
    data: { resetToken: result.resetToken },
  });
});

exports.adminResetPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, newPassword, confirmPassword } = req.body;

  if (!email || !resetToken || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, resetToken, newPassword, and confirmPassword are required.',
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Password confirmation does not match.' });
  }

  await resetPassword({ role: ROLES.ADMIN, email, resetToken, newPassword });

  return res.status(200).json({ success: true, message: 'Password reset successfully.' });
});


