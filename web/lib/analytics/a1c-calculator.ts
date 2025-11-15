/**
 * A1C Estimation Calculator
 * Calculates estimated A1C (eA1C) from average glucose readings
 * Based on the ADAG (A1C-Derived Average Glucose) study formula
 */

export interface A1CEstimate {
  estimatedA1C: number;
  averageGlucose: number;
  readingCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
  recommendation: string;
}

export interface A1CTrend {
  period: string;
  estimatedA1C: number;
  averageGlucose: number;
  readingCount: number;
  change: number | null;
  changePercentage: number | null;
}

/**
 * Calculate estimated A1C from average glucose
 * Formula: A1C = (average glucose + 46.7) / 28.7
 * Source: Nathan et al., Diabetes Care 2008 (ADAG Study)
 */
export function calculateA1C(averageGlucose: number): number {
  if (averageGlucose < 0 || averageGlucose > 600) {
    throw new Error('Invalid glucose value');
  }
  
  const a1c = (averageGlucose + 46.7) / 28.7;
  return Math.round(a1c * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate average glucose from A1C
 * Formula: average glucose = (A1C × 28.7) - 46.7
 */
export function glucoseFromA1C(a1c: number): number {
  if (a1c < 4 || a1c > 15) {
    throw new Error('Invalid A1C value');
  }
  
  const glucose = (a1c * 28.7) - 46.7;
  return Math.round(glucose);
}

/**
 * Categorize A1C level
 */
export function categorizeA1C(a1c: number): A1CEstimate['category'] {
  if (a1c < 5.7) return 'excellent';
  if (a1c < 6.5) return 'good';
  if (a1c < 7.0) return 'fair';
  if (a1c < 8.0) return 'poor';
  return 'very-poor';
}

/**
 * Get recommendation based on A1C level
 */
export function getA1CRecommendation(a1c: number): string {
  const category = categorizeA1C(a1c);
  
  switch (category) {
    case 'excellent':
      return 'Excellent control! Your A1C is in the non-diabetic range. Keep up the great work!';
    case 'good':
      return 'Good control. Your A1C is in the prediabetic range. Continue your current management plan.';
    case 'fair':
      return 'Fair control. Your A1C is at the ADA target for many adults with diabetes. Discuss with your healthcare provider if tighter control is appropriate.';
    case 'poor':
      return 'Your A1C is above the recommended target. Work with your healthcare team to adjust your diabetes management plan.';
    case 'very-poor':
      return 'Your A1C is significantly elevated. Please consult with your healthcare provider urgently to adjust your treatment plan.';
  }
}

/**
 * Calculate A1C estimate from glucose readings
 */
export function estimateA1C(
  glucoseReadings: Array<{ value: number; system_time: string }>,
  startDate?: Date,
  endDate?: Date
): A1CEstimate {
  if (!glucoseReadings || glucoseReadings.length === 0) {
    throw new Error('No glucose readings provided');
  }

  // Filter by date range if provided
  let filteredReadings = glucoseReadings;
  if (startDate || endDate) {
    filteredReadings = glucoseReadings.filter(reading => {
      const readingDate = new Date(reading.system_time);
      if (startDate && readingDate < startDate) return false;
      if (endDate && readingDate > endDate) return false;
      return true;
    });
  }

  if (filteredReadings.length === 0) {
    throw new Error('No readings in specified date range');
  }

  // Calculate average glucose
  const totalGlucose = filteredReadings.reduce(
    (sum, reading) => sum + reading.value,
    0
  );
  const averageGlucose = totalGlucose / filteredReadings.length;

  // Calculate A1C
  const estimatedA1C = calculateA1C(averageGlucose);

  // Determine date range
  const dates = filteredReadings.map(r => new Date(r.system_time));
  const start = new Date(Math.min(...dates.map(d => d.getTime())));
  const end = new Date(Math.max(...dates.map(d => d.getTime())));

  return {
    estimatedA1C,
    averageGlucose: Math.round(averageGlucose),
    readingCount: filteredReadings.length,
    dateRange: { start, end },
    category: categorizeA1C(estimatedA1C),
    recommendation: getA1CRecommendation(estimatedA1C),
  };
}

/**
 * Calculate A1C trends over multiple periods
 */
export function calculateA1CTrends(
  glucoseReadings: Array<{ value: number; system_time: string }>,
  periods: 'weekly' | 'monthly' = 'monthly'
): A1CTrend[] {
  if (!glucoseReadings || glucoseReadings.length === 0) {
    return [];
  }

  // Sort readings by date
  const sortedReadings = [...glucoseReadings].sort(
    (a, b) => new Date(a.system_time).getTime() - new Date(b.system_time).getTime()
  );

  // Group readings by period
  const groupedReadings = new Map<string, typeof sortedReadings>();
  
  sortedReadings.forEach(reading => {
    const date = new Date(reading.system_time);
    let periodKey: string;
    
    if (periods === 'weekly') {
      // Get week number
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      periodKey = weekStart.toISOString().split('T')[0];
    } else {
      // Get month
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!groupedReadings.has(periodKey)) {
      groupedReadings.set(periodKey, []);
    }
    groupedReadings.get(periodKey)!.push(reading);
  });

  // Calculate A1C for each period
  const trends: A1CTrend[] = [];
  let previousA1C: number | null = null;

  Array.from(groupedReadings.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([period, readings]) => {
      if (readings.length < 10) return; // Skip periods with too few readings

      const totalGlucose = readings.reduce((sum, r) => sum + r.value, 0);
      const averageGlucose = totalGlucose / readings.length;
      const estimatedA1C = calculateA1C(averageGlucose);

      const change = previousA1C !== null ? estimatedA1C - previousA1C : null;
      const changePercentage = previousA1C !== null 
        ? ((estimatedA1C - previousA1C) / previousA1C) * 100 
        : null;

      trends.push({
        period,
        estimatedA1C,
        averageGlucose: Math.round(averageGlucose),
        readingCount: readings.length,
        change: change !== null ? Math.round(change * 10) / 10 : null,
        changePercentage: changePercentage !== null ? Math.round(changePercentage * 10) / 10 : null,
      });

      previousA1C = estimatedA1C;
    });

  return trends;
}

/**
 * Get A1C target ranges
 */
export function getA1CTargets() {
  return {
    excellent: { max: 5.7, label: 'Non-diabetic', color: 'green' },
    good: { max: 6.5, label: 'Prediabetic', color: 'blue' },
    target: { max: 7.0, label: 'ADA Target', color: 'yellow' },
    elevated: { max: 8.0, label: 'Elevated', color: 'orange' },
    high: { min: 8.0, label: 'High Risk', color: 'red' },
  };
}

/**
 * Calculate days until next expected A1C test
 * (Typically every 3 months for people with diabetes)
 */
export function daysUntilNextA1CTest(lastTestDate: Date): number {
  const nextTestDate = new Date(lastTestDate);
  nextTestDate.setMonth(nextTestDate.getMonth() + 3);
  
  const today = new Date();
  const diffTime = nextTestDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}
