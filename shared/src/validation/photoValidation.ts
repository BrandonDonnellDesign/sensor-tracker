/**
 * Photo data validation utilities
 */

import { ErrorCode, ValidationError, createValidationError } from '../models/Error';
import { PhotoUploadRequest, SUPPORTED_IMAGE_FORMATS, PHOTO_SIZE_LIMITS, SupportedImageFormat } from '../models/Photo';

export interface PhotoValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateFileName = (fileName: string): ValidationError | null => {
  if (!fileName || fileName.trim().length === 0) {
    return createValidationError(
      'File name is required',
      'fileName',
      fileName,
      ['required']
    );
  }

  const trimmed = fileName.trim();
  
  if (trimmed.length > 255) {
    return createValidationError(
      'File name cannot exceed 255 characters',
      'fileName',
      fileName,
      ['maxLength']
    );
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(trimmed)) {
    return createValidationError(
      'File name contains invalid characters',
      'fileName',
      fileName,
      ['invalidChars']
    );
  }

  return null;
};

export const validateFileSize = (fileSize: number): ValidationError | null => {
  if (fileSize === undefined || fileSize === null || fileSize < 0) {
    return createValidationError(
      'File size is required and must be positive',
      'fileSize',
      fileSize,
      ['required', 'positive']
    );
  }

  if (fileSize === 0) {
    return createValidationError(
      'File cannot be empty',
      'fileSize',
      fileSize,
      ['empty']
    );
  }

  if (fileSize > PHOTO_SIZE_LIMITS.MAX_FILE_SIZE) {
    const maxSizeMB = PHOTO_SIZE_LIMITS.MAX_FILE_SIZE / (1024 * 1024);
    return createValidationError(
      `File size cannot exceed ${maxSizeMB}MB`,
      'fileSize',
      fileSize,
      ['maxSize']
    );
  }

  return null;
};

export const validateMimeType = (mimeType: string): ValidationError | null => {
  if (!mimeType || mimeType.trim().length === 0) {
    return createValidationError(
      'MIME type is required',
      'mimeType',
      mimeType,
      ['required']
    );
  }

  const trimmed = mimeType.trim().toLowerCase();
  
  if (!SUPPORTED_IMAGE_FORMATS.includes(trimmed as SupportedImageFormat)) {
    return createValidationError(
      `Unsupported file type. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`,
      'mimeType',
      mimeType,
      ['unsupported']
    );
  }

  return null;
};

export const validateSensorId = (sensorId: string): ValidationError | null => {
  if (!sensorId || sensorId.trim().length === 0) {
    return createValidationError(
      'Sensor ID is required',
      'sensorId',
      sensorId,
      ['required']
    );
  }

  return null;
};

export const validatePhotoUploadRequest = (request: PhotoUploadRequest): PhotoValidationResult => {
  const errors: ValidationError[] = [];

  const sensorIdError = validateSensorId(request.sensorId);
  if (sensorIdError) errors.push(sensorIdError);

  const fileNameError = validateFileName(request.fileName);
  if (fileNameError) errors.push(fileNameError);

  const fileSizeError = validateFileSize(request.fileSize);
  if (fileSizeError) errors.push(fileSizeError);

  const mimeTypeError = validateMimeType(request.mimeType);
  if (mimeTypeError) errors.push(mimeTypeError);

  if (!request.fileData) {
    errors.push(createValidationError(
      'File data is required',
      'fileData',
      request.fileData,
      ['required']
    ));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Utility functions
export const getFileExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif'
  };

  return mimeToExt[mimeType.toLowerCase()] || '.jpg';
};

export const getMimeTypeFromFileName = (fileName: string): string | null => {
  const ext = fileName.toLowerCase().split('.').pop();
  
  const extToMime: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif'
  };

  return extToMime[ext || ''] || null;
};

export const generateUniqueFileName = (originalName: string, sensorId: string): string => {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop() || 'jpg';
  const baseName = originalName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${sensorId}_${baseName}_${timestamp}.${ext}`;
};

// Note: formatFileSize is available from '../utils'