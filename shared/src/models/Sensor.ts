/**
 * Sensor model interface and related types
 */

export enum SensorType {
  DEXCOM = 'dexcom',
  FREESTYLE = 'freestyle'
}

export interface Sensor {
  id: string;
  userId: string;
  sensorType: SensorType;
  serialNumber: string;
  lotNumber?: string; // Optional - only required for Dexcom sensors
  dateAdded: Date;
  isProblematic: boolean;
  issueNotes?: string;
  photos: Photo[];
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  isDeleted: boolean;
}

export interface Photo {
  id: string;
  sensorId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  cloudUrl?: string;
  localPath?: string;
  dateAdded: Date;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  isDeleted: boolean;
}

export interface CreateSensorRequest {
  sensorType: SensorType;
  serialNumber: string;
  lotNumber?: string; // Optional - only required for Dexcom sensors
  dateAdded?: Date;
}

export interface UpdateSensorRequest {
  id: string;
  sensorType?: SensorType;
  serialNumber?: string;
  lotNumber?: string;
  isProblematic?: boolean;
  issueNotes?: string;
}

export interface SensorWithPhotos extends Sensor {
  photos: Photo[];
}

export interface SensorListItem {
  id: string;
  sensorType: SensorType;
  serialNumber: string;
  lotNumber?: string;
  dateAdded: Date;
  isProblematic: boolean;
  photoCount: number;
  updatedAt: Date;
}

export interface SensorFilter {
  sensorType?: SensorType;
  isProblematic?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

export interface SensorSort {
  field: 'dateAdded' | 'serialNumber' | 'lotNumber' | 'updatedAt';
  direction: 'asc' | 'desc';
}