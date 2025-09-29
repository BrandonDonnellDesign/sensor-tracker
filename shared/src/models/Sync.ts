/**
 * Synchronization and conflict resolution types
 */

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: Date;
  pendingChanges: number;
  failedSyncs: number;
  syncProgress?: SyncProgress;
}

export interface SyncProgress {
  total: number;
  completed: number;
  currentOperation: string;
  percentage: number;
}

export interface SyncConflict<T = any> {
  id: string;
  entityType: 'sensor' | 'photo' | 'user';
  entityId: string;
  conflictType: 'update' | 'delete' | 'create';
  localVersion: T;
  remoteVersion: T;
  localTimestamp: Date;
  remoteTimestamp: Date;
  createdAt: Date;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'local' | 'remote' | 'merge' | 'skip';
  mergedData?: any;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'sensor' | 'photo' | 'user';
  entityId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  error?: string;
}

export interface SyncRequest {
  lastSyncAt?: Date;
  operations: SyncOperation[];
}

export interface SyncResponse {
  success: boolean;
  conflicts: SyncConflict[];
  completedOperations: string[];
  failedOperations: Array<{
    operationId: string;
    error: string;
  }>;
  serverTimestamp: Date;
}

export interface IncrementalSyncRequest {
  lastSyncAt: Date;
  entityTypes: Array<'sensor' | 'photo' | 'user'>;
}

export interface IncrementalSyncResponse {
  sensors: {
    created: Sensor[];
    updated: Sensor[];
    deleted: string[];
  };
  photos: {
    created: Photo[];
    updated: Photo[];
    deleted: string[];
  };
  serverTimestamp: Date;
  hasMore: boolean;
}

// Import the Sensor and Photo types
import type { Sensor } from './Sensor';
import type { Photo } from './Sensor';