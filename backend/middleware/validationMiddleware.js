/**
 * Input validation middleware using express-validator
 * Provides common validation rules and error handling
 */

const { body, query, param, validationResult } = require('express-validator');
const asyncHandler = require('./asyncHandler');

/**
 * Sanitize and validate common input fields
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

/**
 * Validate request and return errors if any
 */
const validateRequest = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
});

/**
 * Common validation rules
 */
const validationRules = {
  // Email validation
  email: body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  // Phone validation (Indian format)
  phone: body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit phone number'),

  // Password validation
  password: body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  // ObjectId validation
  objectId: (field = 'id') =>
    param(field)
      .isMongoId()
      .withMessage(`Invalid ${field} format`),

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],

  // Date validation
  date: (field = 'date') =>
    body(field)
      .optional()
      .isISO8601()
      .withMessage(`Invalid ${field} format. Use ISO 8601 format`),

  // String length validation
  stringLength: (field, min = 1, max = 255) =>
    body(field)
      .optional()
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`),
};

module.exports = {
  sanitizeInput,
  validateRequest,
  validationRules,
  body,
  query,
  param,
};

