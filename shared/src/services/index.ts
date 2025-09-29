// Shared service interfaces and base implementations
import type { User, Sensor, Photo, CreateSensorRequest, UpdateSensorRequest, LoginResponse, SyncStatus, SyncConflict } from '../models';

export interface IAuthService {
  login(email: string, password: string): Promise<LoginResponse>;
  register(email: string, password: string): Promise<LoginResponse>;
  logout(): Promise<void>;
  refreshToken(): Promise<string>;
  getCurrentUser(): Promise<User | null>;
}

export interface IDatabaseService {
  // Sensor operations
  createSensor(sensor: CreateSensorRequest): Promise<Sensor>;
  getSensors(): Promise<Sensor[]>;
  getSensorById(id: string): Promise<Sensor | null>;
  updateSensor(id: string, updates: UpdateSensorRequest): Promise<Sensor>;
  deleteSensor(id: string): Promise<void>;
  
  // Photo operations
  addPhotoToSensor(sensorId: string, photo: Omit<Photo, 'id' | 'sensorId' | 'createdAt' | 'updatedAt'>): Promise<Photo>;
  getPhotosBySensorId(sensorId: string): Promise<Photo[]>;
  deletePhoto(id: string): Promise<void>;
  
  // Sync operations
  getLastSyncTime(): Promise<Date | null>;
  setLastSyncTime(time: Date): Promise<void>;
  getPendingChanges(): Promise<any[]>;
}

export interface ISyncService {
  sync(): Promise<void>;
  syncSensors(): Promise<void>;
  syncPhotos(): Promise<void>;
  resolveConflicts(conflicts: SyncConflict[]): Promise<void>;
  getSyncStatus(): Promise<SyncStatus>;
}

export interface IPhotoService {
  capturePhoto(): Promise<string>;
  selectPhoto(): Promise<string>;
  uploadPhoto(localPath: string): Promise<string>;
  downloadPhoto(cloudUrl: string): Promise<string>;
  deletePhoto(id: string): Promise<void>;
  compressImage(path: string): Promise<string>;
}

// Re-export types
export type { User, Sensor, Photo, CreateSensorRequest, UpdateSensorRequest, LoginRequest, LoginResponse, ApiResponse, SyncStatus, SyncConflict } from '../models';