'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { Brain, TrendingUp, Clock } from 'lucide-react';

interface SmartDefault {
  field: string;
  value: any;
  confidence: number;
  reason: string;
}

interface SmartDefaultsProps {
  onDefaultsCalculated?: (defaults: SmartDefault[]) => void;
  className?: string;
}

export function SmartDefaults({ onDefaultsCalculated, className = '' }: SmartDefaultsProps) {
  const { user } = useAuth();
  const [defaults, setDefaults] = useState<SmartDefault[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      calculateSmartDefaults();
    }
  }, [user]);

  const calculateSmartDefaults = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get recent insulin logs for pattern analysis
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: logs, error } = await supabase
        .from('all_insulin_delivery')
        .select('*')
        .eq('user_id', user.id)
        .gte('taken_at', thirtyDaysAgo.toISOString())
        .order('taken_at', { ascending: false });

      if (error) throw error;

      const smartDefaults: SmartDefault[] = [];
      const now = new Date();
      const currentHour = now.getHours();

      // Analyze patterns for smart defaults
      if (logs && logs.length > 0) {
        
        // 1. Most common insulin type by time of day
        const hourlyInsulinTypes = logs
          .filter(log => log.delivery_type !== 'basal' && log.taken_at)
          .reduce((acc, log) => {
            const hour = new Date(log.taken_at!).getHours();
            const timeRange = getTimeRange(hour);
            if (!acc[timeRange]) acc[timeRange] = {};
            if (log.insulin_type) {
              acc[timeRange][log.insulin_type] = (acc[timeRange][log.insulin_type] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, Record<string, number>>);

        const currentTimeRange = getTimeRange(currentHour);
        const currentTimeTypes = hourlyInsulinTypes[currentTimeRange];
        if (currentTimeTypes) {
          const mostCommonType = Object.entries(currentTimeTypes)
            .sort(([,a], [,b]) => b - a)[0];
          
          if (mostCommonType) {
            smartDefaults.push({
              field: 'insulin_type',
              value: mostCommonType[0],
              confidence: Math.min(95, (mostCommonType[1] / Object.values(currentTimeTypes).reduce((a, b) => a + b, 0)) * 100),
              reason: `Most common insulin type for ${currentTimeRange} (${mostCommonType[1]} times)`
            });
          }
        }

        // 2. Average dose size by time of day
        const hourlyDoses = logs
          .filter(log => log.delivery_type !== 'basal' && log.taken_at && log.units)
          .reduce((acc, log) => {
            const hour = new Date(log.taken_at!).getHours();
            const timeRange = getTimeRange(hour);
            if (!acc[timeRange]) acc[timeRange] = [];
            acc[timeRange].push(log.units!);
            return acc;
          }, {} as Record<string, number[]>);

        const currentTimeDoses = hourlyDoses[currentTimeRange];
        if (currentTimeDoses && currentTimeDoses.length > 0) {
          const avgDose = currentTimeDoses.reduce((a, b) => a + b, 0) / currentTimeDoses.length;
          smartDefaults.push({
            field: 'units',
            value: Math.round(avgDose * 10) / 10,
            confidence: Math.min(90, currentTimeDoses.length * 5),
            reason: `Average dose for ${currentTimeRange} (${currentTimeDoses.length} samples)`
          });
        }

        // 3. Most common meal relation by time
        const mealRelations = logs
          .filter(log => log.meal_relation && log.delivery_type !== 'basal' && log.taken_at)
          .reduce((acc, log) => {
            const hour = new Date(log.taken_at!).getHours();
            const timeRange = getTimeRange(hour);
            if (!acc[timeRange]) acc[timeRange] = {};
            acc[timeRange][log.meal_relation!] = (acc[timeRange][log.meal_relation!] || 0) + 1;
            return acc;
          }, {} as Record<string, Record<string, number>>);

        const currentMealRelations = mealRelations[currentTimeRange];
        if (currentMealRelations) {
          const mostCommonMeal = Object.entries(currentMealRelations)
            .sort(([,a], [,b]) => b - a)[0];
          
          if (mostCommonMeal) {
            smartDefaults.push({
              field: 'meal_relation',
              value: mostCommonMeal[0],
              confidence: Math.min(85, (mostCommonMeal[1] / Object.values(currentMealRelations).reduce((a, b) => a + b, 0)) * 100),
              reason: `Common meal relation for ${currentTimeRange}`
            });
          }
        }

        // 4. Most common injection site
        const injectionSites = logs
          .filter(log => log.injection_site && log.delivery_type !== 'basal')
          .reduce((acc, log) => {
            acc[log.injection_site!] = (acc[log.injection_site!] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

        if (Object.keys(injectionSites).length > 0) {
          const mostCommonSite = Object.entries(injectionSites)
            .sort(([,a], [,b]) => b - a)[0];
          
          smartDefaults.push({
            field: 'injection_site',
            value: mostCommonSite[0],
            confidence: Math.min(80, (mostCommonSite[1] / logs.length) * 100),
            reason: `Most frequently used injection site`
          });
        }
      }

      setDefaults(smartDefaults);
      onDefaultsCalculated?.(smartDefaults);

    } catch (error) {
      console.error('Error calculating smart defaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRange = (hour: number): string => {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  };

  if (loading || defaults.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">
          Smart Suggestions
        </h4>
      </div>
      
      <div className="space-y-2">
        {defaults.slice(0, 3).map((default_, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-purple-700 dark:text-purple-300 font-medium capitalize">
                {default_.field.replace('_', ' ')}:
              </span>
              <span className="text-purple-900 dark:text-purple-100 font-semibold">
                {default_.value}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400">
                {Math.round(default_.confidence)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-purple-600 dark:text-purple-400 mt-3 flex items-center">
        <Clock className="h-3 w-3 mr-1" />
        Based on your recent patterns
      </p>
    </div>
  );
}