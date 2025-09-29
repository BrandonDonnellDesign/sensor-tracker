/**
 * Error types and API response interfaces
 */

export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Sync errors
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SYNC_FAILED = 'SYNC_FAILED',
  OFFLINE_MODE = 'OFFLINE_MODE',
  
  // Photo errors
  PHOTO_UPLOAD_FAILED = 'PHOTO_UPLOAD_FAILED',
  PHOTO_NOT_FOUND = 'PHOTO_NOT_FOUND',
  PHOTO_PROCESSING_ERROR = 'PHOTO_PROCESSING_ERROR',
  
  // Permission errors
  CAMERA_PERMISSION_DENIED = 'CAMERA_PERMISSION_DENIED',
  STORAGE_PERMISSION_DENIED = 'STORAGE_PERMISSION_DENIED',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED'
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

export interface ValidationError extends AppError {
  code: ErrorCode.VALIDATION_ERROR;
  field?: string;
  value?: any;
  constraints?: string[];
}

export interface NetworkError extends AppError {
  code: ErrorCode.NETWORK_ERROR | ErrorCode.CONNECTION_TIMEOUT | ErrorCode.SERVER_ERROR;
  statusCode?: number;
  retryable: boolean;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  timestamp: Date;
  requestId: string;
}

export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse extends ApiResponse {
  success: false;
  error: AppError;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiPaginatedResponse<T> extends ApiSuccessResponse<PaginatedResponse<T>> {
  data: PaginatedResponse<T>;
}

// Error factory functions
export const createError = (
  code: ErrorCode,
  message: string,
  details?: Record<string, any>
): AppError => ({
  code,
  message,
  details,
  timestamp: new Date()
});

export const createValidationError = (
  message: string,
  field?: string,
  value?: any,
  constraints?: string[]
): ValidationError => ({
  code: ErrorCode.VALIDATION_ERROR,
  message,
  field,
  value,
  constraints,
  timestamp: new Date()
});

export const createNetworkError = (
  code: ErrorCode.NETWORK_ERROR | ErrorCode.CONNECTION_TIMEOUT | ErrorCode.SERVER_ERROR,
  message: string,
  statusCode?: number,
  retryable: boolean = true
): NetworkError => ({
  code,
  message,
  statusCode,
  retryable,
  timestamp: new Date()
});