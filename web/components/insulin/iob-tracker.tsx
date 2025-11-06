'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useInsulinData } from '@/lib/hooks/use-insulin-data';
import { useCalculatorSettings } from '@/lib/hooks/use-calculator-settings';
import { 
  Clock, 
  Activity, 
  TrendingDown,
  Droplets,
  Loader2
} from 'lucide-react';



interface IOBTrackerProps {
  className?: string;
}

export function IOBTracker({ className = '' }: IOBTrackerProps) {
  const { doses, isLoading: insulinLoading } = useInsulinData();
  const { settings, isLoading: settingsLoading } = useCalculatorSettings();
  const now = new Date();
  
  const isLoading = insulinLoading || settingsLoading;





  // Calculate IOB for each dose using user's insulin settings
  const doseAnalysis = useMemo(() => {
    return doses.map(dose => {
      const hoursElapsed = (now.getTime() - dose.timestamp.getTime()) / (1000 * 60 * 60);
      
      // Get duration from user settings based on insulin type
      const duration = dose.type === 'rapid' ? settings.rapidActingDuration : 
                     dose.type === 'short' ? settings.shortActingDuration :
                     dose.type === 'intermediate' ? 12 : // Default for intermediate
                     dose.type === 'long' ? 24 : // Default for long-acting
                     settings.rapidActingDuration; // Default to rapid-acting duration
      
      let remainingPercentage = 0;
      let activityLevel = 0;
      
      if (hoursElapsed < duration && hoursElapsed >= 0) {
        // Enhanced decay model based on insulin type and user settings
        switch (dose.type) {
          case 'rapid':
            // Rapid acting: peaks at 1-2 hours, uses user's duration setting
            const rapidPeakTime = Math.min(1.5, duration * 0.375); // Peak at ~37.5% of duration
            if (hoursElapsed <= rapidPeakTime) {
              remainingPercentage = 1 - (hoursElapsed * (0.3 / rapidPeakTime)); // 30% decay to peak
              activityLevel = Math.min(1, hoursElapsed / rapidPeakTime);
            } else {
              const decayRate = 1.5 / (duration - rapidPeakTime); // Exponential decay rate
              remainingPercentage = 0.7 * Math.exp(-(hoursElapsed - rapidPeakTime) * decayRate);
              activityLevel = remainingPercentage;
            }
            break;
            
          case 'short':
            // Short acting: peaks at ~50% of duration, uses user's duration setting
            const shortPeakTime = duration * 0.5;
            if (hoursElapsed <= shortPeakTime) {
              remainingPercentage = 1 - (hoursElapsed * (0.25 / shortPeakTime)); // 25% decay to peak
              activityLevel = Math.min(1, hoursElapsed / shortPeakTime);
            } else {
              const decayRate = 1.0 / (duration - shortPeakTime);
              remainingPercentage = 0.75 * Math.exp(-(hoursElapsed - shortPeakTime) * decayRate);
              activityLevel = remainingPercentage;
            }
            break;
            
          case 'intermediate':
          case 'long':
            // Linear decay for longer-acting insulins
            remainingPercentage = Math.max(0, (duration - hoursElapsed) / duration);
            activityLevel = remainingPercentage;
            break;
            
          default:
            // Default to rapid-acting behavior with user's rapid duration
            const defaultPeakTime = Math.min(1.5, settings.rapidActingDuration * 0.375);
            if (hoursElapsed <= defaultPeakTime) {
              remainingPercentage = 1 - (hoursElapsed * (0.3 / defaultPeakTime));
              activityLevel = Math.min(1, hoursElapsed / defaultPeakTime);
            } else {
              const decayRate = 1.5 / (settings.rapidActingDuration - defaultPeakTime);
              remainingPercentage = 0.7 * Math.exp(-(hoursElapsed - defaultPeakTime) * decayRate);
              activityLevel = remainingPercentage;
            }
        }
      }
      
      const remainingInsulin = dose.amount * Math.max(0, remainingPercentage);
      
      return {
        ...dose,
        duration, // Use calculated duration from user settings
        hoursElapsed: Math.round(hoursElapsed * 10) / 10,
        remainingInsulin: Math.round(remainingInsulin * 100) / 100,
        activityLevel: Math.round(activityLevel * 100) / 100,
        isActive: remainingInsulin > 0.1
      };
    }).filter(dose => dose.isActive);
  }, [doses, now, settings.rapidActingDuration, settings.shortActingDuration]);

  // Calculate total IOB
  const totalIOB = useMemo(() => {
    return Math.round(doseAnalysis.reduce((sum, dose) => sum + dose.remainingInsulin, 0) * 100) / 100;
  }, [doseAnalysis]);

  // Calculate peak activity time
  const peakActivity = useMemo(() => {
    if (doseAnalysis.length === 0) return null;
    
    const mostActive = doseAnalysis.reduce((max, dose) => 
      dose.activityLevel > max.activityLevel ? dose : max
    );
    
    return mostActive;
  }, [doseAnalysis]);

  const getInsulinTypeColor = (type: string) => {
    switch (type) {
      case 'rapid': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'short': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'intermediate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'long': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            Insulin on Board (IOB)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading insulin data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (doseAnalysis.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            Insulin on Board (IOB)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active insulin doses</p>
            <p className="text-sm">IOB tracking will appear here after insulin doses</p>
            

          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            Insulin on Board (IOB)
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
            Rapid: {settings.rapidActingDuration}h | Short: {settings.shortActingDuration}h
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* IOB Summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center p-2 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {totalIOB}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Total IOB (units)
            </div>
          </div>
          
          <div className="text-center p-2 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {doseAnalysis.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Active Doses
            </div>
          </div>
          
          <div className="text-center p-2 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-sm sm:text-lg font-bold text-orange-600 dark:text-orange-400">
              {peakActivity ? `${Math.round(peakActivity.activityLevel * 100)}%` : '0%'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Peak Activity
            </div>
          </div>
        </div>

        {/* Active Doses */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Doses
          </h3>
          
          <div className="space-y-3">
            {doseAnalysis.map((dose) => (
              <div key={dose.id} className="border rounded-lg p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Badge className={getInsulinTypeColor(dose.type)}>
                      {dose.type.toUpperCase()}
                    </Badge>
                    <span className="font-medium text-sm sm:text-base">{dose.amount} units</span>
                    <span className="text-xs sm:text-sm text-gray-500">
                      at {formatTime(dose.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-left sm:text-right">
                    <div className="font-semibold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                      {dose.remainingInsulin} units
                    </div>
                    <div className="text-xs text-gray-500">
                      {dose.hoursElapsed}h elapsed
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Remaining Insulin</span>
                    <span>{Math.round((dose.remainingInsulin / dose.amount) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(dose.remainingInsulin / dose.amount) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Activity Level</span>
                    <span>{Math.round(dose.activityLevel * 100)}%</span>
                  </div>
                  <Progress 
                    value={dose.activityLevel * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IOB Timeline Visualization */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            IOB Timeline
          </h3>
          
          <div className="relative">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Now</span>
              <span>+1h</span>
              <span>+2h</span>
              <span>+3h</span>
              <span>+4h</span>
            </div>
            
            <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg relative overflow-hidden">
              {doseAnalysis.map((dose, index) => {
                const width = Math.max(10, (dose.remainingInsulin / totalIOB) * 100);
                const left = (dose.hoursElapsed / 6) * 100;
                
                return (
                  <div
                    key={dose.id}
                    className={`absolute h-4 rounded opacity-70 ${
                      dose.type === 'rapid' ? 'bg-red-400' :
                      dose.type === 'short' ? 'bg-orange-400' :
                      dose.type === 'intermediate' ? 'bg-blue-400' :
                      'bg-purple-400'
                    }`}
                    style={{
                      left: `${Math.max(0, Math.min(90, left))}%`,
                      width: `${Math.min(width, 100 - left)}%`,
                      top: `${4 + (index * 16)}px`
                    }}
                    title={`${dose.amount} units ${dose.type} - ${dose.remainingInsulin} remaining`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}