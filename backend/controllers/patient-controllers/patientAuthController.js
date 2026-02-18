const Patient = require('../../models/Patient');
const asyncHandler = require('../../middleware/asyncHandler');
const { createAccessToken, createRefreshToken, verifyRefreshToken, blacklistToken, decodeToken } = require('../../utils/tokenService');
const { sendSignupAcknowledgementEmail } = require('../../services/emailService');
const { requestLoginOtp, verifyLoginOtp } = require('../../services/loginOtpService');
const { getProfileByRoleAndId, updateProfileByRoleAndId } = require('../../services/profileService');
const { ROLES } = require('../../utils/constants');

const parseName = ({ firstName, lastName, name }) => {
  if (firstName) {
    return {
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : lastName,
    };
  }

  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return {
      firstName: parts.shift(),
      lastName: parts.join(' '),
    };
  }

  return { firstName: undefined, lastName: undefined };
};

const buildAuthResponse = (user, role) => {
  const payload = { id: user._id, role };
  return {
    accessToken: createAccessToken(payload),
    refreshToken: createRefreshToken(payload),
  };
};

exports.registerPatient = asyncHandler(async (req, res) => {
  const {
    name,
    firstName,
    lastName,
    email,
    phone,
  } = req.body;

  const resolvedName = parseName({ name, firstName, lastName });

  if (!resolvedName.firstName || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Required fields missing. Provide name/firstName, email, and phone.',
    });
  }

  const existingEmail = await Patient.findOne({ email });

  if (existingEmail) {
    return res.status(400).json({
      success: false,
      message: 'Email already registered. Please login.',
    });
  }

  const existingPhone = await Patient.findOne({ phone });

  if (existingPhone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number already registered. Please login or use a different number.',
    });
  }

  // Create patient account with only basic info
  const patient = await Patient.create({
    firstName: resolvedName.firstName,
    lastName: resolvedName.lastName || '',
    email,
    phone,
  });


  // Send OTP to phone for verification
  const result = await requestLoginOtp({ role: ROLES.PATIENT, phone });

  return res.status(201).json({
    success: true,
    message: 'Account created. OTP sent to your mobile number. Please verify to complete registration.',
    data: {
      patient: {
        _id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
      },
      phone: result.phone,
    },
  });
});

// Request login OTP
exports.requestLoginOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required.',
    });
  }

  const result = await requestLoginOtp({ role: ROLES.PATIENT, phone });

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {
      phone: result.phone,
    },
  });
});

// Verify OTP and login
exports.loginPatient = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Phone number and OTP are required.',
    });
  }

  const result = await verifyLoginOtp({ role: ROLES.PATIENT, phone, otp });
  const { user } = result;

  const tokens = buildAuthResponse(user, ROLES.PATIENT);

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: {
      patient: user,
      tokens,
    },
  });
});

exports.getPatientProfile = asyncHandler(async (req, res) => {
  const patient = await getProfileByRoleAndId(ROLES.PATIENT, req.auth.id);

  return res.status(200).json({
    success: true,
    data: patient,
  });
});

exports.updatePatientProfile = asyncHandler(async (req, res) => {
  const updates = { ...req.body };

  if (updates.name && !updates.firstName) {
    const resolvedName = parseName({ name: updates.name });
    updates.firstName = resolvedName.firstName;
    updates.lastName = resolvedName.lastName;
  }

  delete updates.name;

  if (updates.bloodGroup) {
    updates.bloodGroup = String(updates.bloodGroup).toUpperCase();
  }

  const patient = await updateProfileByRoleAndId(ROLES.PATIENT, req.auth.id, updates);

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: patient,
  });
});

exports.logoutPatient = asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  // Blacklist access token if provided
  if (accessToken) {
    try {
      const decoded = decodeToken(accessToken);
      if (decoded && decoded.id && decoded.role) {
        await blacklistToken(accessToken, 'access', decoded.id, decoded.role, 'logout');
      }
    } catch (error) {
      // Token might be expired, but we still clear cookies
      console.log('Error blacklisting access token:', error.message);
    }
  }

  // Blacklist refresh token if provided
  if (refreshToken) {
    try {
      const decoded = decodeToken(refreshToken);
      if (decoded && decoded.id && decoded.role) {
        await blacklistToken(refreshToken, 'refresh', decoded.id, decoded.role, 'logout');
      }
    } catch (error) {
      // Token might be expired, but we still clear cookies
      console.log('Error blacklisting refresh token:', error.message);
    }
  }

  // Clear cookies
  res.clearCookie('token');
  res.clearCookie('refreshToken');

  return res.status(200).json({
    success: true,
    message: 'Logout successful. All tokens have been revoked.',
  });
});

// Refresh token endpoint
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required.',
    });
  }

  try {
    // Verify refresh token (includes blacklist check)
    const decoded = await verifyRefreshToken(refreshToken);

    // Get user from database
    const patient = await Patient.findById(decoded.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if account is active
    if (Object.prototype.hasOwnProperty.call(patient, 'isActive') && patient.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive.',
      });
    }

    // Blacklist old refresh token (token rotation)
    try {
      await blacklistToken(refreshToken, 'refresh', decoded.id, decoded.role, 'refresh');
    } catch (error) {
      // If blacklisting fails, continue anyway (token might already be blacklisted)
      console.log('Error blacklisting old refresh token:', error.message);
    }

    // Generate new tokens
    const payload = { id: patient._id, role: ROLES.PATIENT };
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

exports.getPatientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterRole = req.auth.role;
  const requesterId = String(req.auth.id);

  if (requesterRole !== ROLES.ADMIN && requesterId !== String(id)) {
    const error = new Error('You are not authorized to access this patient profile.');
    error.status = 403;
    throw error;
  }

  const patient = await getProfileByRoleAndId(ROLES.PATIENT, id);

  return res.status(200).json({ success: true, data: patient });
});

