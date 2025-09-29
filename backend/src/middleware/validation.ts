import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
export const validateRegistration: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

/**
 * Validation rules for user login
 */
export const validateLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for sensor creation
 */
export const validateSensor: ValidationChain[] = [
  body('serialNumber')
    .trim()
    .notEmpty()
    .withMessage('Serial number is required')
    .isLength({ max: 255 })
    .withMessage('Serial number must be less than 255 characters'),
  body('lotNumber')
    .trim()
    .notEmpty()
    .withMessage('Lot number is required')
    .isLength({ max: 255 })
    .withMessage('Lot number must be less than 255 characters'),
  body('dateAdded')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format'),
  body('isProblematic')
    .optional()
    .isBoolean()
    .withMessage('isProblematic must be a boolean'),
  body('issueNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Issue notes must be less than 2000 characters')
];

/**
 * Validation rules for sensor updates
 */
export const validateSensorUpdate: ValidationChain[] = [
  body('serialNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Serial number cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Serial number must be less than 255 characters'),
  body('lotNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Lot number cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Lot number must be less than 255 characters'),
  body('isProblematic')
    .optional()
    .isBoolean()
    .withMessage('isProblematic must be a boolean'),
  body('issueNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Issue notes must be less than 2000 characters')
];