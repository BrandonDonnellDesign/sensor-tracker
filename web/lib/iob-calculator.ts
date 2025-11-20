/**
 * Insulin on Board (IOB) Calculator
 * 
 * CRITICAL: These calculations affect user health and safety.
 * All changes must be thoroughly tested.
 * 
 * References:
 * - Walsh, J., & Roberts, R. (2006). Pumping Insulin
 * - Scheiner, G. (2020). Think Like a Pancreas
 */

export interface InsulinDose {
  id: string;
  amount: number;
  timestamp: Date;
  insulinType: 'rapid' | 'short' | 'intermediate' | 'long';
  duration: number; // hours
}

export interface IOBResult {
  totalIOB: number;
  activeIOB: number;
  expiredIOB: number;
  doses: Array<{
    id: string;
    amount: number;
    remainingAmount: number;
    percentageRemaining: number;
    hoursElapsed: number;
    hoursRemaining: number;
  }>;
}

/**
 * Standard insulin duration by type (in hours)
 * Based on clinical guidelines
 */
export const INSULIN_DURATIONS = {
  rapid: 4,        // Humalog, Novolog, Apidra: 3-4 hours
  short: 6,        // Regular insulin: 5-6 hours
  intermediate: 16, // NPH: 12-18 hours
  long: 24,        // Lantus, Levemir, Tresiba: 24+ hours
} as const;

/**
 * Calculate decay factor for insulin activity
 * Uses exponential decay model for more accurate IOB calculation
 * 
 * @param hoursElapsed - Hours since insulin was taken
 * @param duration - Total duration of insulin action (hours)
 * @returns Decay factor between 0 and 1
 */
export function calculateDecayFactor(hoursElapsed: number, duration: number): number {
  // Validate inputs
  if (hoursElapsed < 0) {
    throw new Error('Hours elapsed cannot be negative');
  }
  
  if (duration <= 0) {
    throw new Error('Duration must be positive');
  }
  
  // If time elapsed exceeds duration, insulin is fully absorbed
  if (hoursElapsed >= duration) {
    return 0;
  }
  
  // If no time has elapsed, full dose is active
  if (hoursElapsed === 0) {
    return 1;
  }
  
  // Exponential decay model
  // This more accurately represents insulin absorption than linear decay
  const decayRate = 4 / duration; // Adjusted for realistic absorption curve
  const factor = Math.exp(-decayRate * hoursElapsed);
  
  // Ensure result is between 0 and 1
  return Math.max(0, Math.min(1, factor));
}

/**
 * Calculate Insulin on Board (IOB) from multiple doses
 * 
 * @param doses - Array of insulin doses
 * @param currentTime - Current time (defaults to now)
 * @returns IOB calculation results
 */
export function calculateIOB(
  doses: InsulinDose[],
  currentTime: Date = new Date()
): IOBResult {
  let totalIOB = 0;
  let activeIOB = 0;
  let expiredIOB = 0;
  
  const doseDetails = doses.map(dose => {
    const hoursElapsed = Math.max(0, (currentTime.getTime() - dose.timestamp.getTime()) / (1000 * 60 * 60));
    const decayFactor = calculateDecayFactor(hoursElapsed, dose.duration);
    const remainingAmount = dose.amount * decayFactor;
    const percentageRemaining = decayFactor * 100;
    const hoursRemaining = Math.max(0, dose.duration - hoursElapsed);
    
    if (remainingAmount > 0) {
      activeIOB += remainingAmount;
    } else {
      expiredIOB += dose.amount;
    }
    
    totalIOB += remainingAmount;
    
    return {
      id: dose.id,
      amount: dose.amount,
      remainingAmount: Math.round(remainingAmount * 100) / 100,
      percentageRemaining: Math.round(percentageRemaining * 100) / 100,
      hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      hoursRemaining: Math.round(hoursRemaining * 100) / 100,
    };
  });
  
  return {
    totalIOB: Math.round(totalIOB * 100) / 100,
    activeIOB: Math.round(activeIOB * 100) / 100,
    expiredIOB: Math.round(expiredIOB * 100) / 100,
    doses: doseDetails,
  };
}

/**
 * Calculate insulin dose for carbohydrate coverage
 * 
 * @param carbs - Grams of carbohydrates
 * @param insulinToCarb - Insulin-to-carb ratio (e.g., 1:10 means 1 unit per 10g carbs)
 * @returns Units of insulin needed
 */
export function calculateCarbCoverage(carbs: number, insulinToCarb: number): number {
  if (carbs < 0) {
    throw new Error('Carbs cannot be negative');
  }
  
  if (insulinToCarb <= 0) {
    throw new Error('Insulin-to-carb ratio must be positive');
  }
  
  const units = carbs / insulinToCarb;
  return Math.round(units * 100) / 100;
}

/**
 * Calculate correction dose for high blood glucose
 * 
 * @param currentGlucose - Current blood glucose (mg/dL)
 * @param targetGlucose - Target blood glucose (mg/dL)
 * @param correctionFactor - Insulin sensitivity factor (how much 1 unit drops glucose)
 * @returns Units of insulin needed for correction
 */
export function calculateCorrectionDose(
  currentGlucose: number,
  targetGlucose: number,
  correctionFactor: number
): number {
  if (currentGlucose < 0 || targetGlucose < 0) {
    throw new Error('Glucose values cannot be negative');
  }
  
  if (correctionFactor <= 0) {
    throw new Error('Correction factor must be positive');
  }
  
  // Only correct if glucose is above target
  const glucoseDifference = Math.max(0, currentGlucose - targetGlucose);
  const units = glucoseDifference / correctionFactor;
  
  return Math.round(units * 100) / 100;
}

/**
 * Calculate total insulin dose with IOB adjustment
 * 
 * @param carbCoverage - Units needed for carb coverage
 * @param correctionDose - Units needed for correction
 * @param currentIOB - Current insulin on board
 * @returns Adjusted insulin dose (never negative)
 */
export function calculateTotalDose(
  carbCoverage: number,
  correctionDose: number,
  currentIOB: number
): number {
  if (carbCoverage < 0 || correctionDose < 0 || currentIOB < 0) {
    throw new Error('All dose values must be non-negative');
  }
  
  const totalBeforeIOB = carbCoverage + correctionDose;
  const adjustedDose = Math.max(0, totalBeforeIOB - currentIOB);
  
  return Math.round(adjustedDose * 100) / 100;
}

/**
 * Get insulin duration by type
 * 
 * @param insulinType - Type of insulin
 * @returns Duration in hours
 */
export function getInsulinDuration(
  insulinType: 'rapid' | 'short' | 'intermediate' | 'long'
): number {
  return INSULIN_DURATIONS[insulinType];
}

/**
 * Validate insulin calculation inputs
 * Throws descriptive errors for invalid inputs
 */
export function validateCalculationInputs(params: {
  carbs?: number;
  currentGlucose?: number;
  targetGlucose?: number;
  insulinToCarb?: number;
  correctionFactor?: number;
}): void {
  const { carbs, currentGlucose, targetGlucose, insulinToCarb, correctionFactor } = params;
  
  if (carbs !== undefined && (carbs < 0 || carbs > 500)) {
    throw new Error('Carbs must be between 0 and 500 grams');
  }
  
  if (currentGlucose !== undefined && (currentGlucose < 20 || currentGlucose > 600)) {
    throw new Error('Current glucose must be between 20 and 600 mg/dL');
  }
  
  if (targetGlucose !== undefined && (targetGlucose < 70 || targetGlucose > 180)) {
    throw new Error('Target glucose must be between 70 and 180 mg/dL');
  }
  
  if (insulinToCarb !== undefined && (insulinToCarb < 1 || insulinToCarb > 50)) {
    throw new Error('Insulin-to-carb ratio must be between 1 and 50');
  }
  
  if (correctionFactor !== undefined && (correctionFactor < 10 || correctionFactor > 200)) {
    throw new Error('Correction factor must be between 10 and 200');
  }
}
