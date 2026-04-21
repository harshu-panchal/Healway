const asyncHandler = require('./asyncHandler');
const { verifyAccessToken } = require('../utils/tokenService');
const { getModelForRole, ROLES } = require('../utils/getModelForRole');
const { APPROVAL_STATUS } = require('../utils/constants');
const { canDoctorLogin, isTokenRevokedForDoctor } = require('../utils/doctorAccess');

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const extractToken = (req) => {
  // Priority 1: Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  // Priority 2: Cookie token
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
};

const protect = (...allowedRoles) =>
  asyncHandler(async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
      throw createError(401, 'Authentication token missing. Please login again.');
    }

    let decoded;

    try {
      // verifyAccessToken is now async and checks blacklist
      decoded = await verifyAccessToken(token);
    } catch (error) {
      // Handle specific error types
      if (error.name === 'TokenExpiredError') {
        throw createError(401, 'Access token has expired. Please refresh your token.');
      }
      if (error.name === 'TokenRevokedError') {
        throw createError(401, 'Token has been revoked. Please login again.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw createError(401, 'Invalid token. Please login again.');
      }
      throw createError(401, 'Token verification failed. Please login again.');
    }

    const { id, role } = decoded;

    // Validate decoded token structure
    if (!id || !role) {
      throw createError(401, 'Invalid token payload');
    }

    const Model = getModelForRole(role);
    const user = await Model.findById(id);

    if (!user) {
      throw createError(401, 'Account not found. Please login again.');
    }

    // Handle both array format and individual arguments
    const roles = allowedRoles.length === 1 && Array.isArray(allowedRoles[0])
      ? allowedRoles[0]
      : allowedRoles;

    // If roles are specified, check if user's role matches
    if (roles.length > 0 && !roles.includes(role)) {
      throw createError(403, 'You do not have access to this resource');
    }

    // Check approval status for doctors
    if (
      [ROLES.DOCTOR].includes(role) &&
      user.status &&
      user.status !== APPROVAL_STATUS.APPROVED
    ) {
      throw createError(403, 'Account is not approved yet. Please wait for admin approval.');
    }

    // Check if account is active
    if ([ROLES.DOCTOR].includes(role) && !canDoctorLogin(user)) {
      throw createError(403, 'Doctor access is disabled by admin. Please contact support.');
    }

    if ([ROLES.DOCTOR].includes(role) && isTokenRevokedForDoctor(user, decoded)) {
      throw createError(401, 'Your session has been ended by admin. Please login again.');
    }

    if (
      ![ROLES.DOCTOR].includes(role) &&
      Object.prototype.hasOwnProperty.call(user, 'isActive') &&
      user.isActive === false
    ) {
      throw createError(403, 'Account is inactive. Please contact support.');
    }

    // Attach user info to request
    req.auth = { id, role };
    req.user = user;

    next();
  });

const authorize = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw createError(403, 'Insufficient permissions');
    }

    next();
  });

module.exports = {
  protect,
  authorize,
};


