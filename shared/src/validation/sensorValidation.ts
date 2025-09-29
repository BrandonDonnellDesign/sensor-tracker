/**
 * Sensor data validation utilities
 */

import { ErrorCode, ValidationError, createValidationError } from '../models/Error';
import { CreateSensorRequest, UpdateSensorRequest, SensorType } from '../models/Sensor';

// Validation patterns
const SERIAL_NUMBER_PATTERN = /^[A-Z0-9]{6,20}$/i;
const LOT_NUMBER_PATTERN = /^[A-Z0-9]{4,15}$/i;

export interface SensorValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateSerialNumber = (serialNumber: string): ValidationError | null => {
  if (!serialNumber || serialNumber.trim().length === 0) {
    return createValidationError(
      'Serial number is required',
      'serialNumber',
      serialNumber,
      ['required']
    );
  }

  const trimmed = serialNumber.trim();
  
  if (!SERIAL_NUMBER_PATTERN.test(trimmed)) {
    return createValidationError(
      'Serial number must be 6-20 alphanumeric characters',
      'serialNumber',
      serialNumber,
      ['pattern', 'length']
    );
  }

  return null;
};

export const validateLotNumber = (lotNumber: string | undefined, sensorType: SensorType, isRequired: boolean = true): ValidationError | null => {
  // For Freestyle sensors, lot number is not required
  if (sensorType === SensorType.FREESTYLE) {
    return null;
  }

  // For Dexcom sensors, lot number is required
  if (sensorType === SensorType.DEXCOM && isRequired) {
    if (!lotNumber || lotNumber.trim().length === 0) {
      return createValidationError(
        'Lot number is required for Dexcom sensors',
        'lotNumber',
        lotNumber,
        ['required']
      );
    }
  }

  // If lot number is provided, validate its format
  if (lotNumber && lotNumber.trim().length > 0) {
    const trimmed = lotNumber.trim();
    
    if (!LOT_NUMBER_PATTERN.test(trimmed)) {
      return createValidationError(
        'Lot number must be 4-15 alphanumeric characters',
        'lotNumber',
        lotNumber,
        ['pattern', 'length']
      );
    }
  }

  return null;
};

export const validateDateAdded = (dateAdded: Date): ValidationError | null => {
  if (!dateAdded) {
    return createValidationError(
      'Date added is required',
      'dateAdded',
      dateAdded,
      ['required']
    );
  }

  if (!(dateAdded instanceof Date) || isNaN(dateAdded.getTime())) {
    return createValidationError(
      'Date added must be a valid date',
      'dateAdded',
      dateAdded,
      ['type']
    );
  }

  const now = new Date();
  const maxFutureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours in future
  
  if (dateAdded > maxFutureDate) {
    return createValidationError(
      'Date added cannot be more than 24 hours in the future',
      'dateAdded',
      dateAdded,
      ['range']
    );
  }

  const minDate = new Date('2000-01-01');
  if (dateAdded < minDate) {
    return createValidationError(
      'Date added cannot be before year 2000',
      'dateAdded',
      dateAdded,
      ['range']
    );
  }

  return null;
};

export const validateIssueNotes = (issueNotes?: string): ValidationError | null => {
  if (issueNotes && issueNotes.length > 1000) {
    return createValidationError(
      'Issue notes cannot exceed 1000 characters',
      'issueNotes',
      issueNotes,
      ['maxLength']
    );
  }

  return null;
};

export const validateSensorType = (sensorType: SensorType): ValidationError | null => {
  if (!sensorType) {
    return createValidationError(
      'Sensor type is required',
      'sensorType',
      sensorType,
      ['required']
    );
  }

  if (!Object.values(SensorType).includes(sensorType)) {
    return createValidationError(
      'Invalid sensor type',
      'sensorType',
      sensorType,
      ['invalid']
    );
  }

  return null;
};

export const validateCreateSensorRequest = (request: CreateSensorRequest): SensorValidationResult => {
  const errors: ValidationError[] = [];

  // Validate sensor type first
  const sensorTypeError = validateSensorType(request.sensorType);
  if (sensorTypeError) errors.push(sensorTypeError);

  // Validate serial number
  const serialError = validateSerialNumber(request.serialNumber);
  if (serialError) errors.push(serialError);

  // Validate lot number based on sensor type
  const lotError = validateLotNumber(request.lotNumber, request.sensorType, true);
  if (lotError) errors.push(lotError);

  // Validate date if provided
  if (request.dateAdded) {
    const dateError = validateDateAdded(request.dateAdded);
    if (dateError) errors.push(dateError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUpdateSensorRequest = (request: UpdateSensorRequest): SensorValidationResult => {
  const errors: ValidationError[] = [];

  if (!request.id || request.id.trim().length === 0) {
    errors.push(createValidationError(
      'Sensor ID is required',
      'id',
      request.id,
      ['required']
    ));
  }

  if (request.sensorType !== undefined) {
    const sensorTypeError = validateSensorType(request.sensorType);
    if (sensorTypeError) errors.push(sensorTypeError);
  }

  if (request.serialNumber !== undefined) {
    const serialError = validateSerialNumber(request.serialNumber);
    if (serialError) errors.push(serialError);
  }

  if (request.lotNumber !== undefined && request.sensorType) {
    const lotError = validateLotNumber(request.lotNumber, request.sensorType, false);
    if (lotError) errors.push(lotError);
  }

  if (request.issueNotes !== undefined) {
    const notesError = validateIssueNotes(request.issueNotes);
    if (notesError) errors.push(notesError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Utility functions for cleaning input
export const cleanSerialNumber = (serialNumber: string): string => {
  return serialNumber.trim().toUpperCase();
};

export const cleanLotNumber = (lotNumber: string): string => {
  return lotNumber.trim().toUpperCase();
};

export const cleanIssueNotes = (issueNotes: string): string => {
  return issueNotes.trim();
};