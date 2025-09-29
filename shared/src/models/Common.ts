/**
 * Common types and utilities used across the application
 */

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Timestamp utilities
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncTimestamps extends Timestamps {
  syncedAt?: Date;
}

export interface SoftDelete {
  isDeleted: boolean;
}

// Entity base interfaces
export interface BaseEntity extends Timestamps {
  id: string;
}

export interface SyncableEntity extends BaseEntity, SyncTimestamps, SoftDelete {
  userId: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// Search and filter types
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

// Platform detection
export type Platform = 'ios' | 'android' | 'web' | 'desktop';

export interface PlatformInfo {
  platform: Platform;
  version: string;
  userAgent?: string;
}

// Environment types
export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  environment: Environment;
  apiBaseUrl: string;
  apiTimeout: number;
  maxRetries: number;
  enableLogging: boolean;
  enableAnalytics: boolean;
}

// Feature flags
export interface FeatureFlags {
  enableOfflineMode: boolean;
  enableRealTimeSync: boolean;
  enablePhotoCompression: boolean;
  enableBiometricAuth: boolean;
  maxPhotosPerSensor: number;
  syncIntervalMinutes: number;
}

// Status enums
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
  SYNCING = 'syncing',
  ERROR = 'error'
}

export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Result wrapper types
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const createSuccess = <T>(data: T): Result<T> => ({
  success: true,
  data
});

export const createFailure = <E>(error: E): Result<never, E> => ({
  success: false,
  error
});

// Async operation wrapper
export interface AsyncOperation<T> {
  id: string;
  status: OperationStatus;
  progress?: number;
  result?: T;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Event types for real-time updates
export interface AppEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface EntityChangeEvent extends AppEvent {
  type: 'entity_changed';
  payload: {
    entityType: 'sensor' | 'photo' | 'user';
    entityId: string;
    changeType: 'created' | 'updated' | 'deleted';
    data: any;
  };
}

export interface SyncEvent extends AppEvent {
  type: 'sync_status_changed';
  payload: {
    status: 'started' | 'progress' | 'completed' | 'failed';
    progress?: number;
    message?: string;
  };
}