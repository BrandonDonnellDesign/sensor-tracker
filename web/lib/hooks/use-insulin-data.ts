'use client';

import { useState, useEffect } from 'react';

export interface InsulinDose {
  id: string;
  amount: number;
  type: 'rapid' | 'short' | 'intermediate' | 'long';
  timestamp: Date;
  duration: number;
  mealCarbs?: number;
  preGlucose?: number;
  postGlucose?: number;
  notes?: string;
}

export interface GlucoseReading {
  id: string;
  value: number;
  timestamp: Date;
  trend?: 'rising' | 'falling' | 'stable';
}

interface UseInsulinDataReturn {
  doses: InsulinDose[];
  currentGlucose: number | null;
  recentReadings: GlucoseReading[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInsulinData(): UseInsulinDataReturn {
  const [doses, setDoses] = useState<InsulinDose[]>([]);
  const [currentGlucose, setCurrentGlucose] = useState<number | null>(null);
  const [recentReadings, setRecentReadings] = useState<GlucoseReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsulinDoses = async () => {
    try {
      const response = await fetch('/api/insulin/doses?limit=50');
      if (!response.ok) throw new Error('Failed to fetch insulin doses');

      const data = await response.json();

      // Transform API data to match our interface
      const transformedDoses: InsulinDose[] = data.doses?.map((dose: any) => ({
        id: dose.id,
        amount: parseFloat(dose.amount),
        type: dose.type || 'rapid',
        timestamp: new Date(dose.timestamp),
        duration: 0, // Will be set by IOB tracker using user settings
        mealCarbs: dose.meal_carbs ? parseFloat(dose.meal_carbs) : undefined,
        preGlucose: dose.pre_glucose ? parseFloat(dose.pre_glucose) : undefined,
        postGlucose: dose.post_glucose ? parseFloat(dose.post_glucose) : undefined,
        notes: dose.notes
      })) || [];

      setDoses(transformedDoses);
    } catch (err) {
      console.error('Error fetching insulin doses:', err);
      setError('Failed to load insulin doses');
    }
  };

  const fetchGlucoseData = async () => {
    try {
      // Fetch more readings for better chart visualization (24h of 5-min readings = ~288)
      const response = await fetch('/api/glucose/readings?limit=300');
      if (!response.ok) throw new Error('Failed to fetch glucose readings');

      const data = await response.json();

      // Transform API data to match GlucoseChart interface
      const transformedReadings: GlucoseReading[] = (Array.isArray(data) ? data : data.readings || []).map((reading: any) => ({
        id: reading.id,
        value: parseFloat(reading.value),
        timestamp: new Date(reading.system_time || reading.timestamp),
        trend: reading.trend
      }));

      setRecentReadings(transformedReadings);

      // Set current glucose to the most recent reading
      if (transformedReadings.length > 0) {
        setCurrentGlucose(transformedReadings[0].value);
      }
    } catch (err) {
      console.error('Error fetching glucose readings:', err);
      setError('Failed to load glucose readings');
    }
  };

  const refetch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchInsulinDoses(),
        fetchGlucoseData()
      ]);
    } catch (err) {
      console.error('Error refetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return {
    doses,
    currentGlucose,
    recentReadings,
    isLoading,
    error,
    refetch
  };
}

// Helper function to get insulin duration by type
export function getDurationByType(type: string): number {
  switch (type) {
    case 'rapid':
      return 4; // 3-5 hours
    case 'short':
      return 6; // 5-8 hours
    case 'intermediate':
      return 12; // 10-16 hours
    case 'long':
      return 24; // 20-24+ hours
    default:
      return 4;
  }
}