/**
 * Photo model interface and related types
 */

export interface PhotoUploadRequest {
  sensorId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileData: Blob | Buffer | string; // Platform-specific file data
}

export interface PhotoUploadResponse {
  id: string;
  fileName: string;
  cloudUrl: string;
  uploadedAt: Date;
}

export interface PhotoMetadata {
  id: string;
  sensorId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dateAdded: Date;
  isDeleted: boolean;
}

export interface PhotoDownloadRequest {
  photoId: string;
  quality?: 'thumbnail' | 'medium' | 'full';
}

export interface PhotoDeleteRequest {
  photoId: string;
  permanent?: boolean;
}

// Supported image formats
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
] as const;

export type SupportedImageFormat = typeof SUPPORTED_IMAGE_FORMATS[number];

// Photo size limits
export const PHOTO_SIZE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DIMENSION: 4096, // 4K resolution
  THUMBNAIL_SIZE: 200,
  MEDIUM_SIZE: 800
} as const;