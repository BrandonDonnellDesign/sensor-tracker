/**
 * Time-in-Range (TIR) Calculator
 * Calculates percentage of time glucose is in target range
 * Based on ADA/ATTD consensus recommendations
 */

export interface TimeInRangeResult {
  totalReadings: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  ranges: {
    veryLow: {
      count: number;
      percentage: number;
      threshold: string;
    };
    low: {
      count: number;
      percentage: number;
      threshold: string;
    };
    inRange: {
      count: number;
      percentage: number;
      threshold: string;
    };
    high: {
      count: number;
      percentage: number;
      threshold: string;
    };
    veryHigh: {
      count: number;
      percentage: number;
      threshold: string;
    };
  };
  averageGlucose: number;
  glucoseManagementIndicator: number; // GMI (estimated A1C)
  coefficientOfVariation: number;
  standardDeviation: number;
  assessment: {
    tirRating: 'excellent' | 'good' | 'fair' | 'poor';
    belowRangeRating: 'excellent' | 'good' | 'fair' | 'poor';
    aboveRangeRating: 'excellent' | 'good' | 'fair' | 'poor';
    overallRating: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  };
}

export interface TimeInRangeTrend {
  period: string;
  inRangePercentage: number;
  belowRangePercentage: number;
  aboveRangePercentage: number;
  averageGlucose: number;
  readingCount: number;
}

/**
 * ADA/ATTD Target Ranges (mg/dL)
 */
export const GLUCOSE_RANGES = {
  veryLow: { min: 0, max: 54, label: 'Very Low', color: 'red' },
  low: { min: 54, max: 70, label: 'Low', color: 'orange' },
  inRange: { min: 70, max: 180, label: 'In Range', color: 'green' },
  high: { min: 180, max: 250, label: 'High', color: 'yellow' },
  veryHigh: { min: 250, max: 600, label: 'Very High', color: 'red' },
};

/**
 * ADA/ATTD Target Goals
 */
export const TIR_TARGETS = {
  inRange: { target: 70, good: 70, fair: 50 }, // >70% is target
  belowRange: { target: 4, good: 4, fair: 10 }, // <4% is target
  veryLow: { target: 1, good: 1, fair: 5 }, // <1% is target
  aboveRange: { target: 25, good: 25, fair: 40 }, // <25% is target
  veryHigh: { target: 5, good: 5, fair: 15 }, // <5% is target
};

/**
 * Calculate Time-in-Range from glucose readings
 */
export function calculateTimeInRange(
  readings: Array<{ value: number; system_time: string }>
): TimeInRangeResult {
  if (!readings || readings.length === 0) {
    throw new Error('No glucose readings provided');
  }

  // Count readings in each range
  let veryLowCount = 0;
  let lowCount = 0;
  let inRangeCount = 0;
  let highCount = 0;
  let veryHighCount = 0;

  readings.forEach(reading => {
    const value = reading.value;
    
    if (value < GLUCOSE_RANGES.veryLow.max) {
      veryLowCount++;
    } else if (value < GLUCOSE_RANGES.low.max) {
      lowCount++;
    } else if (value <= GLUCOSE_RANGES.inRange.max) {
      inRangeCount++;
    } else if (value <= GLUCOSE_RANGES.high.max) {
      highCount++;
    } else {
      veryHighCount++;
    }
  });

  const totalReadings = readings.length;

  // Calculate percentages
  const veryLowPercentage = (veryLowCount / totalReadings) * 100;
  const lowPercentage = (lowCount / totalReadings) * 100;
  const inRangePercentage = (inRangeCount / totalReadings) * 100;
  const highPercentage = (highCount / totalReadings) * 100;
  const veryHighPercentage = (veryHighCount / totalReadings) * 100;

  // Calculate statistics
  const glucoseValues = readings.map(r => r.value);
  const averageGlucose = glucoseValues.reduce((sum, val) => sum + val, 0) / totalReadings;
  const stdDev = calculateStandardDeviation(glucoseValues);
  const cv = (stdDev / averageGlucose) * 100;
  
  // Calculate GMI (Glucose Management Indicator) - estimated A1C
  const gmi = 3.31 + (0.02392 * averageGlucose);

  // Determine date range
  const dates = readings.map(r => new Date(r.system_time));
  const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Assess quality
  const assessment = assessTimeInRange(
    inRangePercentage,
    veryLowPercentage + lowPercentage,
    highPercentage + veryHighPercentage,
    veryLowPercentage,
    cv
  );

  return {
    totalReadings,
    dateRange: {
      start: startDate,
      end: endDate,
    },
    ranges: {
      veryLow: {
        count: veryLowCount,
        percentage: Math.round(veryLowPercentage * 10) / 10,
        threshold: `< ${GLUCOSE_RANGES.veryLow.max} mg/dL`,
      },
      low: {
        count: lowCount,
        percentage: Math.round(lowPercentage * 10) / 10,
        threshold: `${GLUCOSE_RANGES.low.min}-${GLUCOSE_RANGES.low.max} mg/dL`,
      },
      inRange: {
        count: inRangeCount,
        percentage: Math.round(inRangePercentage * 10) / 10,
        threshold: `${GLUCOSE_RANGES.inRange.min}-${GLUCOSE_RANGES.inRange.max} mg/dL`,
      },
      high: {
        count: highCount,
        percentage: Math.round(highPercentage * 10) / 10,
        threshold: `${GLUCOSE_RANGES.high.min}-${GLUCOSE_RANGES.high.max} mg/dL`,
      },
      veryHigh: {
        count: veryHighCount,
        percentage: Math.round(veryHighPercentage * 10) / 10,
        threshold: `> ${GLUCOSE_RANGES.high.max} mg/dL`,
      },
    },
    averageGlucose: Math.round(averageGlucose),
    glucoseManagementIndicator: Math.round(gmi * 10) / 10,
    coefficientOfVariation: Math.round(cv * 10) / 10,
    standardDeviation: Math.round(stdDev),
    assessment,
  };
}

/**
 * Calculate Time-in-Range trends over time
 */
export function calculateTimeInRangeTrends(
  readings: Array<{ value: number; system_time: string }>,
  period: 'daily' | 'weekly' = 'daily'
): TimeInRangeTrend[] {
  if (!readings || readings.length === 0) {
    return [];
  }

  // Group readings by period
  const groupedReadings = new Map<string, typeof readings>();
  
  readings.forEach(reading => {
    const date = new Date(reading.system_time);
    let periodKey: string;
    
    if (period === 'daily') {
      periodKey = date.toISOString().split('T')[0];
    } else {
      // Weekly - get start of week
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      periodKey = weekStart.toISOString().split('T')[0];
    }
    
    if (!groupedReadings.has(periodKey)) {
      groupedReadings.set(periodKey, []);
    }
    groupedReadings.get(periodKey)!.push(reading);
  });

  // Calculate TIR for each period
  const trends: TimeInRangeTrend[] = [];

  Array.from(groupedReadings.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([periodKey, periodReadings]) => {
      if (periodReadings.length < 10) return; // Skip periods with too few readings

      const inRangeCount = periodReadings.filter(
        r => r.value >= GLUCOSE_RANGES.inRange.min && r.value <= GLUCOSE_RANGES.inRange.max
      ).length;
      
      const belowRangeCount = periodReadings.filter(
        r => r.value < GLUCOSE_RANGES.inRange.min
      ).length;
      
      const aboveRangeCount = periodReadings.filter(
        r => r.value > GLUCOSE_RANGES.inRange.max
      ).length;

      const avgGlucose = periodReadings.reduce((sum, r) => sum + r.value, 0) / periodReadings.length;

      trends.push({
        period: periodKey,
        inRangePercentage: Math.round((inRangeCount / periodReadings.length) * 1000) / 10,
        belowRangePercentage: Math.round((belowRangeCount / periodReadings.length) * 1000) / 10,
        aboveRangePercentage: Math.round((aboveRangeCount / periodReadings.length) * 1000) / 10,
        averageGlucose: Math.round(avgGlucose),
        readingCount: periodReadings.length,
      });
    });

  return trends;
}

/**
 * Assess Time-in-Range quality
 */
function assessTimeInRange(
  inRangePercentage: number,
  belowRangePercentage: number,
  aboveRangePercentage: number,
  veryLowPercentage: number,
  cv: number
): TimeInRangeResult['assessment'] {
  // Rate TIR
  let tirRating: TimeInRangeResult['assessment']['tirRating'];
  if (inRangePercentage >= TIR_TARGETS.inRange.target) {
    tirRating = 'excellent';
  } else if (inRangePercentage >= TIR_TARGETS.inRange.good) {
    tirRating = 'good';
  } else if (inRangePercentage >= TIR_TARGETS.inRange.fair) {
    tirRating = 'fair';
  } else {
    tirRating = 'poor';
  }

  // Rate below range
  let belowRangeRating: TimeInRangeResult['assessment']['belowRangeRating'];
  if (belowRangePercentage <= TIR_TARGETS.belowRange.target) {
    belowRangeRating = 'excellent';
  } else if (belowRangePercentage <= TIR_TARGETS.belowRange.good) {
    belowRangeRating = 'good';
  } else if (belowRangePercentage <= TIR_TARGETS.belowRange.fair) {
    belowRangeRating = 'fair';
  } else {
    belowRangeRating = 'poor';
  }

  // Rate above range
  let aboveRangeRating: TimeInRangeResult['assessment']['aboveRangeRating'];
  if (aboveRangePercentage <= TIR_TARGETS.aboveRange.target) {
    aboveRangeRating = 'excellent';
  } else if (aboveRangePercentage <= TIR_TARGETS.aboveRange.good) {
    aboveRangeRating = 'good';
  } else if (aboveRangePercentage <= TIR_TARGETS.aboveRange.fair) {
    aboveRangeRating = 'fair';
  } else {
    aboveRangeRating = 'poor';
  }

  // Overall rating (worst of the three)
  const ratings = [tirRating, belowRangeRating, aboveRangeRating];
  const overallRating = ratings.includes('poor') ? 'poor' 
    : ratings.includes('fair') ? 'fair'
    : ratings.includes('good') ? 'good'
    : 'excellent';

  // Generate recommendations
  const recommendations: string[] = [];

  if (tirRating === 'excellent') {
    recommendations.push('Excellent glucose control! Keep up the great work.');
  } else if (tirRating === 'poor') {
    recommendations.push('Time-in-range is below target. Work with your healthcare team to adjust your diabetes management plan.');
  }

  if (belowRangePercentage > TIR_TARGETS.belowRange.target) {
    recommendations.push('Reduce time below range by adjusting insulin doses or eating more carbs before lows.');
  }

  if (veryLowPercentage > TIR_TARGETS.veryLow.target) {
    recommendations.push('⚠️ Urgent: Too much time in very low range. Discuss with your healthcare provider immediately.');
  }

  if (aboveRangePercentage > TIR_TARGETS.aboveRange.target) {
    recommendations.push('Reduce time above range by adjusting insulin doses, meal timing, or carb intake.');
  }

  if (cv > 36) {
    recommendations.push('High glucose variability detected. Focus on consistent meal timing and insulin dosing.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Your glucose control is on track. Continue your current management plan.');
  }

  return {
    tirRating,
    belowRangeRating,
    aboveRangeRating,
    overallRating,
    recommendations,
  };
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Get color for TIR percentage
 */
export function getTIRColor(percentage: number): string {
  if (percentage >= TIR_TARGETS.inRange.target) return 'green';
  if (percentage >= TIR_TARGETS.inRange.good) return 'blue';
  if (percentage >= TIR_TARGETS.inRange.fair) return 'yellow';
  return 'red';
}
