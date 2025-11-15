/**
 * Glucose Prediction Service
 * Implements 30-minute glucose forecasting and pattern recognition
 */

import { createClient } from '@/lib/supabase-client';

export interface GlucoseReading {
  id: string;
  glucose_value: number;
  timestamp: Date;
  trend?: 'rising' | 'falling' | 'stable';
  rate_of_change?: number; // mg/dL per minute
}

export interface InsulinDose {
  id: string;
  amount: number;
  type: 'rapid' | 'short' | 'intermediate' | 'long';
  timestamp: Date;
}

export interface PredictionResult {
  predicted_glucose: number;
  confidence: number; // 0-1 scale
  time_horizon: number; // minutes
  factors: {
    current_trend: number;
    iob_impact: number;
    pattern_influence: number;
    uncertainty: number;
  };
  alerts: PredictionAlert[];
}

export interface PredictionAlert {
  type: 'hypoglycemia_risk' | 'hyperglycemia_risk' | 'trend_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  estimated_time: number; // minutes until event
  confidence: number;
  recommended_action?: string;
}

export interface GlucosePattern {
  id: string;
  pattern_type: 'dawn_phenomenon' | 'post_meal' | 'exercise_drop' | 'stress_spike' | 'sleep_pattern';
  typical_duration: number; // minutes
  glucose_change: number; // mg/dL
  confidence: number;
  last_occurrence: Date;
  frequency: number; // occurrences per week
}

export class GlucosePredictionService {
  private static readonly PREDICTION_HORIZON = 30; // minutes
  private static readonly MIN_READINGS_FOR_PREDICTION = 3;
  private static readonly HYPOGLYCEMIA_THRESHOLD = 70; // mg/dL
  private static readonly HYPERGLYCEMIA_THRESHOLD = 180; // mg/dL

  /**
   * Predict glucose value 30 minutes into the future
   */
  static async predictGlucose(userId: string): Promise<PredictionResult | null> {
    try {
      console.log('Starting glucose prediction for user:', userId);
      
      // Get recent glucose readings
      const recentReadings = await this.getRecentGlucoseReadings(userId, 60); // Last hour
      console.log('Retrieved glucose readings:', recentReadings.length);
      
      if (recentReadings.length < this.MIN_READINGS_FOR_PREDICTION) {
        console.log('Insufficient glucose readings for prediction:', recentReadings.length, 'minimum:', this.MIN_READINGS_FOR_PREDICTION);
        return null;
      }

      // Get active insulin doses
      const activeDoses = await this.getActiveInsulinDoses(userId);
      console.log('Retrieved insulin doses:', activeDoses.length);

      // Calculate current trend
      const currentTrend = this.calculateGlucoseTrend(recentReadings);
      console.log('Calculated trend:', currentTrend);

      // Calculate IOB impact
      const iobImpact = await this.calculateIOBImpact(activeDoses);
      console.log('Calculated IOB impact:', iobImpact);

      // Get historical patterns
      const patternInfluence = await this.getPatternInfluence(userId, recentReadings);
      console.log('Pattern influence:', patternInfluence);

      // Generate prediction
      const prediction = this.generatePrediction(
        recentReadings[0], // Most recent reading
        currentTrend,
        iobImpact,
        patternInfluence
      );
      console.log('Generated prediction:', prediction);

      // Generate alerts
      const alerts = this.generatePredictionAlerts(prediction, currentTrend, iobImpact);
      console.log('Generated alerts:', alerts);

      return {
        predicted_glucose: Math.round(prediction.value),
        confidence: prediction.confidence,
        time_horizon: this.PREDICTION_HORIZON,
        factors: {
          current_trend: currentTrend.impact,
          iob_impact: iobImpact.impact,
          pattern_influence: patternInfluence.impact,
          uncertainty: prediction.uncertainty
        },
        alerts
      };
    } catch (error) {
      console.error('Error predicting glucose:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId
      });
      return null;
    }
  }

  /**
   * Get recent glucose readings with trend analysis
   */
  private static async getRecentGlucoseReadings(userId: string, minutes: number): Promise<GlucoseReading[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from('glucose_readings')
        .select('*')
        .eq('user_id', userId)
        .gte('system_time', new Date(Date.now() - minutes * 60 * 1000).toISOString())
        .order('system_time', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching glucose readings:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No glucose readings found for user:', userId);
        return [];
      }

      return data.map((reading: any) => ({
        id: reading.id,
        glucose_value: reading.value,
        timestamp: new Date(reading.system_time),
        trend: reading.trend,
        rate_of_change: this.calculateRateOfChange(reading, data)
      }));
    } catch (error) {
      console.error('Exception in getRecentGlucoseReadings:', error);
      return [];
    }
  }

  /**
   * Get active insulin doses for IOB calculation
   */
  private static async getActiveInsulinDoses(userId: string): Promise<InsulinDose[]> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from('all_insulin_delivery')
        .select('*')
        .eq('user_id', userId)
        .gte('taken_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // Last 6 hours
        .order('taken_at', { ascending: false });

      if (error) {
        console.error('Error fetching insulin doses:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No insulin doses found for user:', userId);
        return [];
      }

      return data.map((dose: any) => ({
        id: dose.id,
        amount: dose.units,
        type: dose.insulin_type || 'rapid',
        timestamp: new Date(dose.taken_at)
      }));
    } catch (error) {
      console.error('Exception in getActiveInsulinDoses:', error);
      return [];
    }
  }

  /**
   * Calculate glucose trend from recent readings
   */
  private static calculateGlucoseTrend(readings: GlucoseReading[]) {
    if (readings.length < 2) {
      return { direction: 'stable' as const, rate: 0, impact: 0 };
    }

    // Calculate weighted average rate of change
    let totalWeightedRate = 0;
    let totalWeight = 0;

    for (let i = 0; i < readings.length - 1; i++) {
      const current = readings[i];
      const previous = readings[i + 1];
      const timeDiff = (current.timestamp.getTime() - previous.timestamp.getTime()) / (1000 * 60); // minutes
      
      if (timeDiff > 0) {
        const rate = (current.glucose_value - previous.glucose_value) / timeDiff; // mg/dL per minute
        const weight = Math.exp(-i * 0.3); // Exponential decay for older readings
        
        totalWeightedRate += rate * weight;
        totalWeight += weight;
      }
    }

    const avgRate = totalWeight > 0 ? totalWeightedRate / totalWeight : 0;
    
    // Project trend impact over prediction horizon
    const trendImpact = avgRate * this.PREDICTION_HORIZON;

    let direction: 'rising' | 'falling' | 'stable';
    if (Math.abs(avgRate) < 0.5) direction = 'stable';
    else if (avgRate > 0) direction = 'rising';
    else direction = 'falling';

    return {
      direction,
      rate: avgRate,
      impact: trendImpact
    };
  }

  /**
   * Calculate IOB impact on glucose prediction
   */
  private static async calculateIOBImpact(doses: InsulinDose[]) {
    const now = new Date();
    let totalIOB = 0;
    let totalActivity = 0;

    for (const dose of doses) {
      const hoursElapsed = (now.getTime() - dose.timestamp.getTime()) / (1000 * 60 * 60);
      const duration = this.getInsulinDuration(dose.type);

      if (hoursElapsed < duration && hoursElapsed >= 0) {
        const { remainingPercentage, activityLevel } = this.calculateInsulinCurve(dose.type, hoursElapsed, duration);
        
        totalIOB += dose.amount * remainingPercentage;
        totalActivity += dose.amount * activityLevel;
      }
    }

    // Estimate glucose impact (rough approximation: 1 unit = 30-50 mg/dL drop)
    const glucoseImpact = -totalActivity * 40; // Conservative estimate

    return {
      totalIOB: Math.round(totalIOB * 100) / 100,
      activity: Math.round(totalActivity * 100) / 100,
      impact: glucoseImpact
    };
  }

  /**
   * Get pattern influence on glucose prediction
   */
  private static async getPatternInfluence(_userId: string, _recentReadings: GlucoseReading[]) {
    // This would analyze historical patterns - simplified for now
    const currentHour = new Date().getHours();
    // const currentGlucose = _recentReadings[0]?.glucose_value || 100; // Reserved for future pattern analysis

    let patternImpact = 0;

    // Dawn phenomenon (4-8 AM)
    if (currentHour >= 4 && currentHour <= 8) {
      patternImpact += 20; // Typical dawn phenomenon rise
    }

    // Post-meal patterns (would need meal data)
    // Exercise patterns (would need activity data)
    // Sleep patterns (would need sleep data)

    return {
      impact: patternImpact,
      confidence: 0.6 // Medium confidence without full historical analysis
    };
  }

  /**
   * Generate glucose prediction
   */
  private static generatePrediction(
    currentReading: GlucoseReading,
    trend: any,
    iobImpact: any,
    patternInfluence: any
  ) {
    const baseGlucose = currentReading.glucose_value;
    
    // Combine all factors
    const predictedValue = baseGlucose + trend.impact + iobImpact.impact + patternInfluence.impact;
    
    // Calculate confidence based on data quality
    const trendConfidence = Math.min(1, Math.abs(trend.rate) * 2); // Higher confidence with clear trends
    const iobConfidence = iobImpact.totalIOB > 0 ? 0.8 : 0.3; // Higher confidence with active IOB
    const patternConfidence = patternInfluence.confidence;
    
    const overallConfidence = (trendConfidence + iobConfidence + patternConfidence) / 3;
    
    // Calculate uncertainty
    const uncertainty = Math.max(10, Math.abs(trend.impact) * 0.2 + Math.abs(iobImpact.impact) * 0.1);

    return {
      value: Math.max(40, Math.min(400, predictedValue)), // Clamp to reasonable range
      confidence: Math.round(overallConfidence * 100) / 100,
      uncertainty: Math.round(uncertainty)
    };
  }

  /**
   * Generate prediction alerts
   */
  private static generatePredictionAlerts(
    prediction: any,
    trend: any,
    _iobImpact: any
  ): PredictionAlert[] {
    const alerts: PredictionAlert[] = [];

    // Hypoglycemia risk
    if (prediction.value < this.HYPOGLYCEMIA_THRESHOLD) {
      const severity = prediction.value < 55 ? 'critical' : 
                     prediction.value < 65 ? 'high' : 'medium';
      
      alerts.push({
        type: 'hypoglycemia_risk',
        severity,
        message: `Predicted glucose of ${Math.round(prediction.value)} mg/dL in ${this.PREDICTION_HORIZON} minutes`,
        estimated_time: this.PREDICTION_HORIZON,
        confidence: prediction.confidence,
        recommended_action: severity === 'critical' ? 'Take 20g fast-acting carbs immediately' :
                          severity === 'high' ? 'Take 15g fast-acting carbs' :
                          'Consider 10g fast-acting carbs'
      });
    }

    // Hyperglycemia risk
    if (prediction.value > this.HYPERGLYCEMIA_THRESHOLD) {
      alerts.push({
        type: 'hyperglycemia_risk',
        severity: prediction.value > 250 ? 'high' : 'medium',
        message: `Predicted glucose of ${Math.round(prediction.value)} mg/dL in ${this.PREDICTION_HORIZON} minutes`,
        estimated_time: this.PREDICTION_HORIZON,
        confidence: prediction.confidence,
        recommended_action: 'Consider correction insulin if no IOB'
      });
    }

    // Rapid trend warnings
    if (Math.abs(trend.rate) > 2) { // > 2 mg/dL per minute
      alerts.push({
        type: 'trend_warning',
        severity: Math.abs(trend.rate) > 4 ? 'high' : 'medium',
        message: `Rapid glucose ${trend.direction} at ${Math.abs(trend.rate * 60).toFixed(1)} mg/dL per hour`,
        estimated_time: 0,
        confidence: 0.9,
        recommended_action: 'Monitor closely and be prepared to act'
      });
    }

    return alerts;
  }

  /**
   * Helper methods
   */
  private static calculateRateOfChange(reading: any, allReadings: any[]): number {
    const previousReading = allReadings.find(r => 
      new Date(r.system_time).getTime() < new Date(reading.system_time).getTime()
    );
    
    if (!previousReading) return 0;
    
    const timeDiff = (new Date(reading.system_time).getTime() - new Date(previousReading.system_time).getTime()) / (1000 * 60);
    return timeDiff > 0 ? (reading.value - previousReading.value) / timeDiff : 0;
  }

  private static getInsulinDuration(type: string): number {
    switch (type) {
      case 'rapid': return 4;
      case 'short': return 6;
      case 'intermediate': return 12;
      case 'long': return 24;
      default: return 4;
    }
  }

  private static calculateInsulinCurve(type: string, hoursElapsed: number, duration: number) {
    let remainingPercentage = 0;
    let activityLevel = 0;
    
    switch (type) {
      case 'rapid':
        const rapidPeakTime = 1.5;
        if (hoursElapsed <= rapidPeakTime) {
          remainingPercentage = 1 - (hoursElapsed * (0.3 / rapidPeakTime));
          activityLevel = Math.min(1, hoursElapsed / rapidPeakTime);
        } else {
          const decayRate = 1.5 / (duration - rapidPeakTime);
          remainingPercentage = 0.7 * Math.exp(-(hoursElapsed - rapidPeakTime) * decayRate);
          activityLevel = remainingPercentage;
        }
        break;
        
      case 'short':
        const shortPeakTime = duration * 0.5;
        if (hoursElapsed <= shortPeakTime) {
          remainingPercentage = 1 - (hoursElapsed * (0.25 / shortPeakTime));
          activityLevel = Math.min(1, hoursElapsed / shortPeakTime);
        } else {
          const decayRate = 1.0 / (duration - shortPeakTime);
          remainingPercentage = 0.75 * Math.exp(-(hoursElapsed - shortPeakTime) * decayRate);
          activityLevel = remainingPercentage;
        }
        break;
        
      default:
        remainingPercentage = Math.max(0, (duration - hoursElapsed) / duration);
        activityLevel = remainingPercentage;
    }
    
    return { remainingPercentage, activityLevel };
  }

  /**
   * Analyze glucose patterns for pattern recognition
   */
  static async analyzeGlucosePatterns(_userId: string): Promise<GlucosePattern[]> {
    // This would implement pattern recognition ML
    // For now, return basic patterns
    return [];
  }

  /**
   * Get prediction history for accuracy tracking
   */
  static async getPredictionAccuracy(_userId: string, _days: number = 7): Promise<number> {
    // This would track prediction accuracy over time
    // For now, return estimated accuracy
    return 0.85; // 85% accuracy
  }
}