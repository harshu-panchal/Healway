const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Validate JWT secrets are set and strong
const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || ACCESS_SECRET;

if (!ACCESS_SECRET || ACCESS_SECRET === 'change-me' || ACCESS_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET is weak or not set. Please set a strong secret (min 32 chars) in production!');
}

if (!REFRESH_SECRET || REFRESH_SECRET === ACCESS_SECRET) {
  console.warn('⚠️  WARNING: JWT_REFRESH_SECRET should be different from JWT_SECRET for better security!');
}

const ACCESS_EXPIRE = process.env.JWT_EXPIRE || '7d';
const REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';

// JWT signing options for better security
const jwtOptions = {
  issuer: 'healway-api',
  algorithm: 'HS256',
};

/**
 * Helper to get blacklist key for a token
 */
const getBlacklistKey = (token) => {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return `blacklist:token:${hash}`;
};

/**
 * Create access token with enhanced security
 * @param {Object} payload - Token payload (id, role)
 * @returns {String} JWT access token
 */
const createAccessToken = (payload) => {
  if (!payload || !payload.id || !payload.role) {
    throw new Error('Invalid payload: id and role are required');
  }

  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    },
    ACCESS_SECRET,
    {
      ...jwtOptions,
      expiresIn: ACCESS_EXPIRE,
    }
  );
};

/**
 * Create refresh token with enhanced security
 * @param {Object} payload - Token payload (id, role)
 * @param {String} jti - Optional JWT ID for token rotation
 * @returns {String} JWT refresh token
 */
const createRefreshToken = (payload, jti = null) => {
  if (!payload || !payload.id || !payload.role) {
    throw new Error('Invalid payload: id and role are required');
  }

  const tokenId = jti || crypto.randomBytes(16).toString('hex');

  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
      type: 'refresh',
      jti: tokenId,
      iat: Math.floor(Date.now() / 1000),
    },
    REFRESH_SECRET,
    {
      ...jwtOptions,
      expiresIn: REFRESH_EXPIRE,
    }
  );
};

/**
 * Verify access token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = async (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required and must be a string');
  }

  // Blacklist check removed (Redis removed)

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET, jwtOptions);

    // Validate token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    // Validate required fields
    if (!decoded.id || !decoded.role) {
      throw new Error('Invalid token payload');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const expiredError = new Error('Access token has expired');
      expiredError.name = 'TokenExpiredError';
      throw expiredError;
    }
    if (error.name === 'JsonWebTokenError') {
      const invalidError = new Error('Invalid access token');
      invalidError.name = 'JsonWebTokenError';
      throw invalidError;
    }
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {String} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = async (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required and must be a string');
  }

  // Blacklist check removed (Redis removed)

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, jwtOptions);

    // Validate token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Validate required fields
    if (!decoded.id || !decoded.role || !decoded.jti) {
      throw new Error('Invalid token payload');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const expiredError = new Error('Refresh token has expired');
      expiredError.name = 'TokenExpiredError';
      throw expiredError;
    }
    if (error.name === 'JsonWebTokenError') {
      const invalidError = new Error('Invalid refresh token');
      invalidError.name = 'JsonWebTokenError';
      throw invalidError;
    }
    throw error;
  }
};

/**
 * Decode token without verification (for extracting info from expired tokens)
 * @param {String} token - JWT token to decode
 * @returns {Object} Decoded token payload (may be expired)
 */
const decodeToken = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }
  return jwt.decode(token);
};

/**
 * Blacklist a token (No-op after Redis removal)
 */
const blacklistToken = async (token, tokenType, userId, role, reason = 'logout') => {
  // Blacklist removed (Redis removed)
  return true;
};

/**
 * Blacklist all tokens for a user (No-op after Redis removal)
 */
const blacklistAllUserTokens = async (userId, role, reason = 'security') => {
  // Blacklist removed (Redis removed)
  return { message: 'Blacklist functionality disabled (Redis removed)' };
};

/**
 * Check if token is blacklisted (Always returns false after Redis removal)
 */
const isTokenBlacklisted = async (token) => {
  // Blacklist removed (Redis removed)
  return false;
};

/**
 * Get token expiration date
 * @param {String} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  if (decoded?.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  blacklistToken,
  blacklistAllUserTokens,
  isTokenBlacklisted,
  getTokenExpiration,
};


