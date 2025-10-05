/**
 * Tests for validation utilities
 */

import {
  validateSerialNumber,
  validateLotNumber,
  validateCreateSensorRequest,
  validateEmail,
  validatePassword,
  validateCreateUserRequest,
  validatePhotoUploadRequest,
  SensorType
} from '../..';

describe('Sensor Validation', () => {
  describe('validateSerialNumber', () => {
    it('should accept valid serial numbers', () => {
      expect(validateSerialNumber('ABC123')).toBeNull();
      expect(validateSerialNumber('XYZ789DEF')).toBeNull();
      expect(validateSerialNumber('123456789012345')).toBeNull();
    });

    it('should reject invalid serial numbers', () => {
      expect(validateSerialNumber('')).toBeTruthy();
      expect(validateSerialNumber('AB')).toBeTruthy(); // too short
      expect(validateSerialNumber('ABC123!@#')).toBeTruthy(); // invalid chars
    });
  });

  describe('validateLotNumber', () => {
    it('should accept valid lot numbers', () => {
      expect(validateLotNumber('LOT1', SensorType.DEXCOM)).toBeNull();
      expect(validateLotNumber('ABC123', SensorType.DEXCOM)).toBeNull();
      expect(validateLotNumber('XYZ789', SensorType.DEXCOM)).toBeNull();
      // Freestyle sensors don't require lot numbers
      expect(validateLotNumber('', SensorType.FREESTYLE)).toBeNull();
    });

    it('should reject invalid lot numbers for Dexcom sensors', () => {
      expect(validateLotNumber('', SensorType.DEXCOM)).toBeTruthy();
      expect(validateLotNumber('AB', SensorType.DEXCOM)).toBeTruthy(); // too short
      expect(validateLotNumber('LOT1!@#', SensorType.DEXCOM)).toBeTruthy(); // invalid chars
    });
  });

  describe('validateCreateSensorRequest', () => {
    it('should validate complete sensor request', () => {
      const request = {
        serialNumber: 'ABC123',
        lotNumber: 'LOT456',
        sensorType: SensorType.FREESTYLE
      };
      
      const result = validateCreateSensorRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid sensor request', () => {
      const request = {
        serialNumber: '',
        lotNumber: 'AB', // too short
        sensorType: SensorType.FREESTYLE
      };
      
      const result = validateCreateSensorRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Auth Validation', () => {
  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBeNull();
      expect(validateEmail('user.name@domain.co.uk')).toBeNull();
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('')).toBeTruthy();
      expect(validateEmail('invalid-email')).toBeTruthy();
      expect(validateEmail('test@')).toBeTruthy();
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      expect(validatePassword('StrongPass123!')).toBeNull();
      expect(validatePassword('MySecure@Pass1')).toBeNull();
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('')).toBeTruthy();
      expect(validatePassword('weak')).toBeTruthy();
      expect(validatePassword('nouppercaseornumbers')).toBeTruthy();
    });
  });
});

describe('Photo Validation', () => {
  describe('validatePhotoUploadRequest', () => {
    it('should validate complete photo request', () => {
      const request = {
        sensorId: 'sensor-123',
        fileName: 'photo.jpg',
        fileSize: 1024000, // 1MB
        mimeType: 'image/jpeg',
        fileData: new Blob(['test data'])
      };
      
      const result = validatePhotoUploadRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid photo request', () => {
      const request = {
        sensorId: '',
        fileName: '',
        fileSize: 0,
        mimeType: 'invalid/type',
        fileData: null as any
      };
      
      const result = validatePhotoUploadRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});