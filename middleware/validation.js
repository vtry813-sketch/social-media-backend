// Validation middleware using express-validator
const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and cannot exceed 50 characters'),
  handleValidationErrors
];

const validateUserLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('website')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Website URL cannot exceed 200 characters'),
  handleValidationErrors
];

// Post validation rules
const validatePostCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Post content is required and cannot exceed 2000 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
  handleValidationErrors
];

const validatePostUpdate = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Post content cannot exceed 2000 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),
  handleValidationErrors
];

// Comment validation rules
const validateCommentCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content is required and cannot exceed 1000 characters'),
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),
  handleValidationErrors
];

const validateCommentUpdate = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content cannot exceed 1000 characters'),
  handleValidationErrors
];

// Follow validation rules
const validateFollow = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// ID validation middleware
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePostCreation,
  validatePostUpdate,
  validateCommentCreation,
  validateCommentUpdate,
  validateFollow,
  validatePagination,
  validateObjectId,
  handleValidationErrors
};