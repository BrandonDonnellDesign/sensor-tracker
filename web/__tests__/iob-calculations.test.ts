/**
 * Tests for Insulin on Board (IOB) calculations
 * These are critical for user safety and must be accurate
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateDecayFactor,
  calculateIOB,
  calculateCarbCoverage,
  calculateCorrectionDose,
  calculateTotalDose,
  getInsulinDuration,
  validateCalculationInputs,
  INSULIN_DURATIONS,
  type InsulinDose,
} from '../lib/iob-calculator';

describe('IOB Calculations', () => {
  describe('calculateDecayFactor', () => {
    it('should return 1.0 for time = 0 (no decay)', () => {
      const factor = calculateDecayFactor(0, 4);
      expect(factor).toBe(1.0);
    });

    it('should return 0.0 for time >= duration (complete decay)', () => {
      const factor = calculateDecayFactor(4, 4);
      expect(factor).toBe(0.0);
    });

    it('should return value between 0 and 1 for partial decay', () => {
      const factor = calculateDecayFactor(2, 4);
      expect(factor).toBeGreaterThan(0);
      expect(factor).toBeLessThan(1);
    });

    it('should throw error for negative time', () => {
      expect(() => calculateDecayFactor(-1, 4)).toThrow('Hours elapsed cannot be negative');
    });

    it('should throw error for zero or negative duration', () => {
      expect(() => calculateDecayFactor(1, 0)).toThrow('Duration must be positive');
      expect(() => calculateDecayFactor(1, -1)).toThrow('Duration must be positive');
    });

    it('should return 0 for time exceeding duration', () => {
      const factor = calculateDecayFactor(5, 4);
      expect(factor).toBe(0);
    });
  });

  describe('calculateIOB', () => {
    it('should calculate IOB correctly for single dose', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const doses: InsulinDose[] = [{
        id: '1',
        amount: 10,
        timestamp: twoHoursAgo,
        insulinType: 'rapid',
        duration: 4,
      }];
      
      const result = calculateIOB(doses);
      expect(result.totalIOB).toBeGreaterThan(0);
      expect(result.totalIOB).toBeLessThan(10);
      expect(result.activeIOB).toBe(result.totalIOB);
      expect(result.expiredIOB).toBe(0);
    });

    it('should sum IOB from multiple doses', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const doses: InsulinDose[] = [
        { id: '1', amount: 5, timestamp: oneHourAgo, insulinType: 'rapid', duration: 4 },
        { id: '2', amount: 5, timestamp: twoHoursAgo, insulinType: 'rapid', duration: 4 },
      ];
      
      const result = calculateIOB(doses);
      expect(result.totalIOB).toBeGreaterThan(0);
      expect(result.doses).toHaveLength(2);
    });

    it('should return 0 for expired doses', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const doses: InsulinDose[] = [{
        id: '1',
        amount: 10,
        timestamp: fiveHoursAgo,
        insulinType: 'rapid',
        duration: 4,
      }];
      
      const result = calculateIOB(doses);
      expect(result.totalIOB).toBe(0);
      expect(result.activeIOB).toBe(0);
      expect(result.expiredIOB).toBe(10);
    });

    it('should handle empty dose array', () => {
      const result = calculateIOB([]);
      expect(result.totalIOB).toBe(0);
      expect(result.activeIOB).toBe(0);
      expect(result.expiredIOB).toBe(0);
      expect(result.doses).toHaveLength(0);
    });

    it('should handle different insulin types with different durations', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      
      const doses: InsulinDose[] = [
        { id: '1', amount: 5, timestamp: oneHourAgo, insulinType: 'rapid', duration: 4 },
        { id: '2', amount: 10, timestamp: oneHourAgo, insulinType: 'long', duration: 24 },
      ];
      
      const result = calculateIOB(doses);
      expect(result.totalIOB).toBeGreaterThan(0);
      expect(result.doses).toHaveLength(2);
    });
  });

  describe('Insulin Type Durations', () => {
    it('should use correct duration for rapid-acting insulin', () => {
      expect(INSULIN_DURATIONS.rapid).toBe(4);
      expect(getInsulinDuration('rapid')).toBe(4);
    });

    it('should use correct duration for short-acting insulin', () => {
      expect(INSULIN_DURATIONS.short).toBe(6);
      expect(getInsulinDuration('short')).toBe(6);
    });

    it('should use correct duration for intermediate-acting insulin', () => {
      expect(INSULIN_DURATIONS.intermediate).toBe(16);
      expect(getInsulinDuration('intermediate')).toBe(16);
    });

    it('should use correct duration for long-acting insulin', () => {
      expect(INSULIN_DURATIONS.long).toBe(24);
      expect(getInsulinDuration('long')).toBe(24);
    });
  });

  describe('Safety Checks', () => {
    it('should never return negative IOB', () => {
      const doses: InsulinDose[] = [{
        id: '1',
        amount: 10,
        timestamp: new Date(),
        insulinType: 'rapid',
        duration: 4,
      }];
      
      const result = calculateIOB(doses);
      expect(result.totalIOB).toBeGreaterThanOrEqual(0);
      expect(result.activeIOB).toBeGreaterThanOrEqual(0);
    });

    it('should never return IOB greater than total units given', () => {
      const doses: InsulinDose[] = [{
        id: '1',
        amount: 10,
        timestamp: new Date(),
        insulinType: 'rapid',
        duration: 4,
      }];
      
      const result = calculateIOB(doses);
      expect(result.totalIOB).toBeLessThanOrEqual(10);
    });
  });
});

describe('Insulin Calculator', () => {
  describe('Carb Ratio Calculation', () => {
    it('should calculate correct bolus for given carbs and ratio', () => {
      const units = calculateCarbCoverage(60, 10);
      expect(units).toBe(6);
    });

    it('should handle decimal carb amounts', () => {
      const units = calculateCarbCoverage(45, 10);
      expect(units).toBe(4.5);
    });

    it('should round to 2 decimal places', () => {
      const units = calculateCarbCoverage(33, 10);
      expect(units).toBe(3.3);
    });

    it('should throw error for negative carbs', () => {
      expect(() => calculateCarbCoverage(-10, 10)).toThrow('Carbs cannot be negative');
    });

    it('should throw error for zero or negative ratio', () => {
      expect(() => calculateCarbCoverage(60, 0)).toThrow('Insulin-to-carb ratio must be positive');
      expect(() => calculateCarbCoverage(60, -10)).toThrow('Insulin-to-carb ratio must be positive');
    });
  });

  describe('Correction Factor Calculation', () => {
    it('should calculate correct correction dose', () => {
      const units = calculateCorrectionDose(200, 100, 50);
      expect(units).toBe(2);
    });

    it('should not suggest negative correction', () => {
      const units = calculateCorrectionDose(80, 100, 50);
      expect(units).toBe(0);
    });

    it('should handle decimal results', () => {
      const units = calculateCorrectionDose(175, 100, 50);
      expect(units).toBe(1.5);
    });

    it('should throw error for negative glucose values', () => {
      expect(() => calculateCorrectionDose(-100, 100, 50)).toThrow('Glucose values cannot be negative');
      expect(() => calculateCorrectionDose(100, -100, 50)).toThrow('Glucose values cannot be negative');
    });

    it('should throw error for zero or negative correction factor', () => {
      expect(() => calculateCorrectionDose(200, 100, 0)).toThrow('Correction factor must be positive');
      expect(() => calculateCorrectionDose(200, 100, -50)).toThrow('Correction factor must be positive');
    });
  });

  describe('IOB Adjustment', () => {
    it('should subtract IOB from recommended dose', () => {
      const dose = calculateTotalDose(5, 2, 2);
      expect(dose).toBe(5); // 5 + 2 - 2 = 5
    });

    it('should not recommend negative dose after IOB adjustment', () => {
      const dose = calculateTotalDose(3, 1, 5);
      expect(dose).toBe(0); // 3 + 1 - 5 = -1, but should be 0
    });

    it('should handle zero IOB', () => {
      const dose = calculateTotalDose(5, 2, 0);
      expect(dose).toBe(7);
    });

    it('should throw error for negative values', () => {
      expect(() => calculateTotalDose(-5, 2, 1)).toThrow('All dose values must be non-negative');
      expect(() => calculateTotalDose(5, -2, 1)).toThrow('All dose values must be non-negative');
      expect(() => calculateTotalDose(5, 2, -1)).toThrow('All dose values must be non-negative');
    });
  });

  describe('Input Validation', () => {
    it('should validate carbs range', () => {
      expect(() => validateCalculationInputs({ carbs: -10 })).toThrow('Carbs must be between 0 and 500 grams');
      expect(() => validateCalculationInputs({ carbs: 600 })).toThrow('Carbs must be between 0 and 500 grams');
      expect(() => validateCalculationInputs({ carbs: 50 })).not.toThrow();
    });

    it('should validate glucose ranges', () => {
      expect(() => validateCalculationInputs({ currentGlucose: 10 })).toThrow('Current glucose must be between 20 and 600 mg/dL');
      expect(() => validateCalculationInputs({ currentGlucose: 700 })).toThrow('Current glucose must be between 20 and 600 mg/dL');
      expect(() => validateCalculationInputs({ targetGlucose: 50 })).toThrow('Target glucose must be between 70 and 180 mg/dL');
      expect(() => validateCalculationInputs({ targetGlucose: 200 })).toThrow('Target glucose must be between 70 and 180 mg/dL');
    });

    it('should validate insulin ratios', () => {
      expect(() => validateCalculationInputs({ insulinToCarb: 0 })).toThrow('Insulin-to-carb ratio must be between 1 and 50');
      expect(() => validateCalculationInputs({ insulinToCarb: 60 })).toThrow('Insulin-to-carb ratio must be between 1 and 50');
      expect(() => validateCalculationInputs({ correctionFactor: 5 })).toThrow('Correction factor must be between 10 and 200');
      expect(() => validateCalculationInputs({ correctionFactor: 250 })).toThrow('Correction factor must be between 10 and 200');
    });
  });
});

/**
 * IMPORTANT: These calculations affect user health and safety.
 * All tests must pass before deploying to production.
 * 
 * Test Coverage:
 * - ✅ Decay factor calculations
 * - ✅ IOB calculations (single and multiple doses)
 * - ✅ Insulin type durations
 * - ✅ Safety checks (no negative IOB, bounds checking)
 * - ✅ Carb ratio calculations
 * - ✅ Correction factor calculations
 * - ✅ IOB adjustment logic
 * - ✅ Input validation
 */
