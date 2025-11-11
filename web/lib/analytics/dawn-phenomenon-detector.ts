/**
 * Dawn Phenomenon Detection Service
 * Analyzes morning glucose patterns to detect dawn phenomenon
 */

import { createClient } from '@/lib/supabase-client';
import { createAdminClient } from '@/lib/supabase-admin';

export interface DawnPhenomenonReading {
  date: string;
  bedtimeGlucose: number | null; // ~10-11 PM
  midnightGlucose: number | null; // ~12-2 AM  
  earlyMorningGlucose: number | null; // ~4-6 AM
  wakingGlucose: number | null; // ~6-8 AM
  dawnRise: number | null; // Rise from midnight to waking
  hasDawnPhenomenon: boolean;
}

export interface DawnPhenomenonAnalysis {
  analysisDate: Date;
  daysAnalyzed: number;
  dawnPhenomenonDays: number;
  dawnPhenomenonPercentage: number;
  averageDawnRise: number;
  maxDawnRise: number;
  typicalRiseTime: string; // e.g., "4:00 AM - 6:00 AM"
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  recommendations: string[];
  weeklyPattern: {
    day: string;
    percentage: number;
    averageRise: number;
  }[];
  recentTrend: 'improving' | 'stable' | 'worsening';
}

export class DawnPhenomenonDetector {
  private client: any;
  private isServerSide: boolean;

  constructor(useAdminClient = false) {
    this.isServerSide = typeof window === 'undefined';
    this.client = useAdminClient && this.isServerSide ? createAdminClient() : createClient();
  }

  /**
   * Analyze dawn phenomenon for a specific user over the last N days
   */
  async analyzeDawnPhenomenon(userId: string, daysToAnalyze = 14): Promise<DawnPhenomenonAnalysis> {
    // If running in browser, use API endpoint
    if (!this.isServerSide) {
      const response = await fetch(`/api/analytics/dawn-phenomenon?days=${daysToAnalyze}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to analyze dawn phenomenon');
      }
      
      const result = await response.json();
      return result.data;
    }

    // Server-side analysis
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysToAnalyze * 24 * 60 * 60 * 1000);

    // Get glucose readings for the analysis period
    const { data: readings, error } = await this.client
      .from('glucose_readings')
      .select('value, system_time, display_time')
      .eq('user_id', userId)
      .gte('system_time', startDate.toISOString())
      .lte('system_time', endDate.toISOString())
      .order('system_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch glucose readings: ${error.message}`);
    }

    if (!readings || readings.length < 50) {
      throw new Error('Insufficient glucose data for dawn phenomenon analysis (need at least 50 readings)');
    }

    // Group readings by date and analyze each day
    const dailyAnalysis = this.groupReadingsByDate(readings);
    const dawnReadings = this.analyzeDailyDawnPatterns(dailyAnalysis);

    // Calculate overall statistics
    const validDays = dawnReadings.filter(day => day.hasDawnPhenomenon !== null);
    const dawnPhenomenonDays = dawnReadings.filter(day => day.hasDawnPhenomenon).length;
    const dawnPhenomenonPercentage = validDays.length > 0 ? (dawnPhenomenonDays / validDays.length) * 100 : 0;

    const dawnRises = dawnReadings
      .filter(day => day.dawnRise !== null && day.dawnRise > 0)
      .map(day => day.dawnRise!);

    const averageDawnRise = dawnRises.length > 0 ? dawnRises.reduce((a, b) => a + b, 0) / dawnRises.length : 0;
    const maxDawnRise = dawnRises.length > 0 ? Math.max(...dawnRises) : 0;

    // Determine severity
    const severity = this.determineSeverity(dawnPhenomenonPercentage, averageDawnRise);

    // Generate recommendations
    const recommendations = this.generateRecommendations(severity, averageDawnRise, dawnPhenomenonPercentage);

    // Analyze weekly patterns
    const weeklyPattern = this.analyzeWeeklyPattern(dawnReadings);

    // Determine recent trend (last 7 days vs previous 7 days)
    const recentTrend = this.analyzeRecentTrend(dawnReadings);

    return {
      analysisDate: new Date(),
      daysAnalyzed: validDays.length,
      dawnPhenomenonDays,
      dawnPhenomenonPercentage,
      averageDawnRise,
      maxDawnRise,
      typicalRiseTime: this.determineTypicalRiseTime(dawnReadings),
      severity,
      recommendations,
      weeklyPattern,
      recentTrend
    };
  }

  /**
   * Group glucose readings by date
   */
  private groupReadingsByDate(readings: any[]): Map<string, any[]> {
    const dailyReadings = new Map<string, any[]>();

    readings.forEach(reading => {
      const date = new Date(reading.system_time).toDateString();
      if (!dailyReadings.has(date)) {
        dailyReadings.set(date, []);
      }
      dailyReadings.get(date)!.push({
        ...reading,
        hour: new Date(reading.system_time).getHours(),
        minute: new Date(reading.system_time).getMinutes()
      });
    });

    return dailyReadings;
  }

  /**
   * Analyze dawn phenomenon patterns for each day
   */
  private analyzeDailyDawnPatterns(dailyReadings: Map<string, any[]>): DawnPhenomenonReading[] {
    const results: DawnPhenomenonReading[] = [];

    dailyReadings.forEach((readings, dateStr) => {
      const date = new Date(dateStr);
      
      // Find readings in different time windows
      const bedtimeGlucose = this.findGlucoseInTimeWindow(readings, 22, 23); // 10-11 PM
      const midnightGlucose = this.findGlucoseInTimeWindow(readings, 0, 2); // 12-2 AM
      const earlyMorningGlucose = this.findGlucoseInTimeWindow(readings, 4, 6); // 4-6 AM
      const wakingGlucose = this.findGlucoseInTimeWindow(readings, 6, 8); // 6-8 AM

      // Calculate dawn rise (from lowest overnight to waking)
      let dawnRise: number | null = null;
      let hasDawnPhenomenon = false;

      if (midnightGlucose !== null && wakingGlucose !== null) {
        // Use the lowest glucose between midnight and early morning as baseline
        const overnightLow = earlyMorningGlucose !== null 
          ? Math.min(midnightGlucose, earlyMorningGlucose)
          : midnightGlucose;
        
        dawnRise = wakingGlucose - overnightLow;
        
        // Dawn phenomenon criteria: rise of >30 mg/dL from overnight low to waking
        hasDawnPhenomenon = dawnRise >= 30;
      }

      results.push({
        date: date.toISOString().split('T')[0],
        bedtimeGlucose,
        midnightGlucose,
        earlyMorningGlucose,
        wakingGlucose,
        dawnRise,
        hasDawnPhenomenon: midnightGlucose !== null && wakingGlucose !== null ? hasDawnPhenomenon : false
      });
    });

    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Find glucose reading in a specific time window (returns average if multiple readings)
   */
  private findGlucoseInTimeWindow(readings: any[], startHour: number, endHour: number): number | null {
    const windowReadings = readings.filter(reading => {
      const hour = reading.hour;
      if (startHour <= endHour) {
        return hour >= startHour && hour <= endHour;
      } else {
        // Handle overnight window (e.g., 22-2 means 22-23 and 0-2)
        return hour >= startHour || hour <= endHour;
      }
    });

    if (windowReadings.length === 0) return null;

    // Return average glucose in the time window
    const sum = windowReadings.reduce((total, reading) => total + reading.value, 0);
    return Math.round(sum / windowReadings.length);
  }

  /**
   * Determine dawn phenomenon severity
   */
  private determineSeverity(percentage: number, averageRise: number): 'none' | 'mild' | 'moderate' | 'severe' {
    if (percentage < 20 || averageRise < 30) return 'none';
    if (percentage < 40 || averageRise < 50) return 'mild';
    if (percentage < 70 || averageRise < 80) return 'moderate';
    return 'severe';
  }

  /**
   * Generate personalized recommendations based on analysis
   */
  private generateRecommendations(severity: string, averageRise: number, percentage: number): string[] {
    const recommendations: string[] = [];

    if (severity === 'none') {
      recommendations.push('Your morning glucose patterns look good! Continue your current routine.');
      return recommendations;
    }

    // General recommendations
    recommendations.push('Consider discussing dawn phenomenon with your healthcare provider.');
    
    if (severity === 'mild') {
      recommendations.push('Try eating a small protein snack before bed to help stabilize overnight glucose.');
      recommendations.push('Consider adjusting your evening meal timing or composition.');
    } else if (severity === 'moderate') {
      recommendations.push('Your basal insulin may need adjustment for overnight coverage.');
      recommendations.push('Consider using an insulin pump or long-acting insulin with different timing.');
      recommendations.push('Track your sleep quality - poor sleep can worsen dawn phenomenon.');
    } else if (severity === 'severe') {
      recommendations.push('Urgent: Discuss immediate basal insulin adjustments with your endocrinologist.');
      recommendations.push('Consider continuous glucose monitoring if not already using one.');
      recommendations.push('Your dawn phenomenon is significant and needs medical attention.');
    }

    // Additional recommendations based on rise amount
    if (averageRise > 100) {
      recommendations.push('Your glucose rises are quite large - this may indicate insufficient overnight insulin.');
    }

    if (percentage > 80) {
      recommendations.push('Dawn phenomenon occurs most days - consistent treatment approach needed.');
    }

    return recommendations;
  }

  /**
   * Analyze weekly patterns (which days of week have more dawn phenomenon)
   */
  private analyzeWeeklyPattern(dawnReadings: DawnPhenomenonReading[]): Array<{day: string, percentage: number, averageRise: number}> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyStats = dayNames.map(day => ({ day, count: 0, dawnCount: 0, totalRise: 0, riseCount: 0 }));

    dawnReadings.forEach(reading => {
      const dayOfWeek = new Date(reading.date).getDay();
      const stats = weeklyStats[dayOfWeek];
      
      stats.count++;
      if (reading.hasDawnPhenomenon) {
        stats.dawnCount++;
      }
      if (reading.dawnRise !== null && reading.dawnRise > 0) {
        stats.totalRise += reading.dawnRise;
        stats.riseCount++;
      }
    });

    return weeklyStats.map(stats => ({
      day: stats.day,
      percentage: stats.count > 0 ? (stats.dawnCount / stats.count) * 100 : 0,
      averageRise: stats.riseCount > 0 ? stats.totalRise / stats.riseCount : 0
    }));
  }

  /**
   * Analyze recent trend (improving, stable, or worsening)
   */
  private analyzeRecentTrend(dawnReadings: DawnPhenomenonReading[]): 'improving' | 'stable' | 'worsening' {
    if (dawnReadings.length < 14) return 'stable';

    const recent7Days = dawnReadings.slice(-7);
    const previous7Days = dawnReadings.slice(-14, -7);

    const recentPercentage = recent7Days.filter(d => d.hasDawnPhenomenon).length / recent7Days.length * 100;
    const previousPercentage = previous7Days.filter(d => d.hasDawnPhenomenon).length / previous7Days.length * 100;

    const difference = recentPercentage - previousPercentage;

    if (difference < -10) return 'improving';
    if (difference > 10) return 'worsening';
    return 'stable';
  }

  /**
   * Determine typical time when dawn phenomenon occurs
   */
  private determineTypicalRiseTime(_dawnReadings: DawnPhenomenonReading[]): string {
    // For now, return a general time range
    // Could be enhanced to analyze when the steepest rise occurs
    return '4:00 AM - 7:00 AM';
  }

  /**
   * Get dawn phenomenon data for a specific date range (for charts/visualization)
   */
  async getDawnPhenomenonData(userId: string, startDate: Date, endDate: Date): Promise<DawnPhenomenonReading[]> {
    const { data: readings, error } = await this.client
      .from('glucose_readings')
      .select('value, system_time')
      .eq('user_id', userId)
      .gte('system_time', startDate.toISOString())
      .lte('system_time', endDate.toISOString())
      .order('system_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch glucose readings: ${error.message}`);
    }

    if (!readings || readings.length === 0) {
      return [];
    }

    const dailyReadings = this.groupReadingsByDate(readings);
    return this.analyzeDailyDawnPatterns(dailyReadings);
  }
}

export const dawnPhenomenonDetector = new DawnPhenomenonDetector();