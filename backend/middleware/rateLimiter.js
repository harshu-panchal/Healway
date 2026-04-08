const rateLimit = require('express-rate-limit');

// General rate limiter - Increased limits for development
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
const defaultMax = process.env.NODE_ENV === 'production' ? 120 : 1000;
const max = Number(process.env.RATE_LIMIT_MAX) || defaultMax;

const limiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  skipSuccessfulRequests: process.env.NODE_ENV === 'development',
  skip: (req, res) => {
    return process.env.DISABLE_RATE_LIMIT === 'true';
  },
});

// Stricter rate limiter for authentication endpoints
const authWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 5;

const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  skipSuccessfulRequests: false,
  skip: (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    return !isProduction && (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test' ||
      process.env.DISABLE_AUTH_RATE_LIMIT === 'true'
    );
  },
});

// Rate limiter for password reset endpoints
const passwordResetWindowMs = Number(process.env.PASSWORD_RESET_WINDOW_MS) || 60 * 60 * 1000; // 1 hour
const passwordResetMax = Number(process.env.PASSWORD_RESET_MAX) || 3;

const passwordResetRateLimiter = rateLimit({
  windowMs: passwordResetWindowMs,
  max: passwordResetMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour.',
  },
  skip: (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    return !isProduction && (
      process.env.NODE_ENV === 'development' ||
      process.env.DISABLE_AUTH_RATE_LIMIT === 'true'
    );
  },
});

// Rate limiter for OTP requests
const otpWindowMs = Number(process.env.OTP_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000; // 5 minutes
const otpMax = Number(process.env.OTP_RATE_LIMIT_MAX) || 3;

const otpRateLimiter = rateLimit({
  windowMs: otpWindowMs,
  max: otpMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again after 5 minutes.',
  },
  skipSuccessfulRequests: false,
  skip: (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    return !isProduction && (
      process.env.NODE_ENV === 'development' ||
      process.env.DISABLE_OTP_RATE_LIMIT === 'true'
    );
  },
});

module.exports = {
  limiter,
  authRateLimiter,
  passwordResetRateLimiter,
  otpRateLimiter,
};

