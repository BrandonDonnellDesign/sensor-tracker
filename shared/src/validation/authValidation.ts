/**
 * Authentication data validation utilities
 */

import { ErrorCode, ValidationError, createValidationError } from '../models/Error';
import { CreateUserRequest, LoginRequest } from '../models/User';

// Validation patterns
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export interface AuthValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateEmail = (email: string): ValidationError | null => {
  if (!email || email.trim().length === 0) {
    return createValidationError(
      'Email is required',
      'email',
      email,
      ['required']
    );
  }

  const trimmed = email.trim().toLowerCase();
  
  if (!EMAIL_PATTERN.test(trimmed)) {
    return createValidationError(
      'Please enter a valid email address',
      'email',
      email,
      ['format']
    );
  }

  if (trimmed.length > 254) {
    return createValidationError(
      'Email address is too long',
      'email',
      email,
      ['maxLength']
    );
  }

  return null;
};

export const validatePassword = (password: string): ValidationError | null => {
  if (!password) {
    return createValidationError(
      'Password is required',
      'password',
      password,
      ['required']
    );
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return createValidationError(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      'password',
      password,
      ['minLength']
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return createValidationError(
      `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`,
      'password',
      password,
      ['maxLength']
    );
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return createValidationError(
      'Password must contain at least one uppercase letter',
      'password',
      password,
      ['uppercase']
    );
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return createValidationError(
      'Password must contain at least one lowercase letter',
      'password',
      password,
      ['lowercase']
    );
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return createValidationError(
      'Password must contain at least one number',
      'password',
      password,
      ['number']
    );
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return createValidationError(
      'Password must contain at least one special character',
      'password',
      password,
      ['specialChar']
    );
  }

  return null;
};

export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): ValidationError | null => {
  if (!confirmPassword) {
    return createValidationError(
      'Password confirmation is required',
      'confirmPassword',
      confirmPassword,
      ['required']
    );
  }

  if (password !== confirmPassword) {
    return createValidationError(
      'Passwords do not match',
      'confirmPassword',
      confirmPassword,
      ['match']
    );
  }

  return null;
};

export const validateCreateUserRequest = (request: CreateUserRequest): AuthValidationResult => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(request.email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(request.password);
  if (passwordError) errors.push(passwordError);

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateLoginRequest = (request: LoginRequest): AuthValidationResult => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(request.email);
  if (emailError) errors.push(emailError);

  if (!request.password || request.password.trim().length === 0) {
    errors.push(createValidationError(
      'Password is required',
      'password',
      request.password,
      ['required']
    ));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateRefreshToken = (refreshToken: string): ValidationError | null => {
  if (!refreshToken || refreshToken.trim().length === 0) {
    return createValidationError(
      'Refresh token is required',
      'refreshToken',
      refreshToken,
      ['required']
    );
  }

  return null;
};

// Utility functions for cleaning input
export const cleanEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

// Password strength checker
export interface PasswordStrength {
  score: number; // 0-4 (weak to strong)
  feedback: string[];
  isStrong: boolean;
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (password.length < PASSWORD_MIN_LENGTH) {
    feedback.push(`Use at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters');
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Add lowercase letters');
  }
  if (!/\d/.test(password)) {
    feedback.push('Add numbers');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Add special characters');
  }

  return {
    score: Math.min(score, 4),
    feedback,
    isStrong: score >= 4
  };
};