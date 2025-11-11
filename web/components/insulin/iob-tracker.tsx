'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useInsulinCalculatorSettings } from '@/lib/hooks/use-insulin-calculator-settings';
import { createClient } from '@/lib/supabase-client';
import { Droplets, Clock, TrendingDown, AlertTriangle } from 'lucide-react';

interface InsulinLog {
  id: string;
  units: number;
  taken_at: string;
  insulin_type: 'rapid' | 'short' | 'intermediate' | 'long';
  notes?: string;
}

interface IOBCalculation {
  totalIOB: number;
  rapidActingIOB: number;
  shortActingIOB: number;
  logs: Array<{
    log: InsulinLog;
    remainingUnits: number;
    hoursRemaining: number;
  }>;
}

interface IOBTrackerProps {
  className?: string;
  showDetails?: boolean;
}

export function IOBTracker({ className = '', showDetails = false }: IOBTrackerProps) {
  const { user } = useAuth();
  const { settings } = useInsulinCalculatorSettings();
  const [iobData, setIOBData] = useState<IOBCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !settings) return;
    
    calculateIOB();
    // Refresh IOB every 15 minutes
    const interval = setInterval(calculateIOB, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, settings]);

  const calculateIOB = async () => {
    if (!user || !settings) return;

    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get bolus insulin logs from the last 8 hours (covers rapid/short-acting action times)
      // Note: Basal insulin is excluded as it doesn't contribute to IOB calculations
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 8);
      
      const { data: logs, error } = await supabase
        .from('insulin_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('taken_at', cutoffTime.toISOString())
        .neq('delivery_type', 'basal') // Exclude basal insulin from IOB
        .in('insulin_type', ['rapid', 'short']) // Only include bolus insulin types
        .order('taken_at', { ascending: false });

      if (error) throw error;

      const calculation = calculateIOBFromLogs((logs || []) as InsulinLog[]);
      setIOBData(calculation);
    } catch (err) {
      console.error('Error calculating IOB:', err);
      setError('Failed to calculate insulin on board');
    } finally {
      setLoading(false);
    }
  };

  const calculateIOBFromLogs = (logs: InsulinLog[]): IOBCalculation => {
    const now = new Date();
    let totalIOB = 0;
    let rapidActingIOB = 0;
    let shortActingIOB = 0;
    const activeLogs: IOBCalculation['logs'] = [];

    logs.forEach(log => {
      const logTime = new Date(log.taken_at);
      const hoursElapsed = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
      
      // Only process bolus insulin (rapid and short-acting)
      let actionTime = 4; // Default rapid-acting
      if (log.insulin_type === 'short') actionTime = 6;
      // Note: basal insulin (intermediate/long) is now filtered out at query level

      if (hoursElapsed < actionTime) {
        // Simple linear decay model (can be made more sophisticated)
        const remainingPercentage = Math.max(0, (actionTime - hoursElapsed) / actionTime);
        const remainingUnits = log.units * remainingPercentage;
        
        totalIOB += remainingUnits;
        
        if (log.insulin_type === 'rapid') {
          rapidActingIOB += remainingUnits;
        } else if (log.insulin_type === 'short') {
          shortActingIOB += remainingUnits;
        }

        activeLogs.push({
          log,
          remainingUnits: Math.round(remainingUnits * 10) / 10,
          hoursRemaining: Math.round((actionTime - hoursElapsed) * 10) / 10
        });
      }
    });

    return {
      totalIOB: Math.round(totalIOB * 10) / 10,
      rapidActingIOB: Math.round(rapidActingIOB * 10) / 10,
      shortActingIOB: Math.round(shortActingIOB * 10) / 10,
      logs: activeLogs
    };
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-600 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  const hasHighIOB = (iobData?.totalIOB || 0) > 3;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Droplets className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
          <h3 className="font-medium text-gray-900 dark:text-slate-100">
            Insulin on Board
          </h3>
          <span className="text-xs text-gray-500 dark:text-slate-500 ml-1">
            (Bolus only)
          </span>
        </div>
        {hasHighIOB && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
      </div>

      <div className="space-y-3">
        {/* Total IOB */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-400">Total IOB:</span>
          <span className={`text-lg font-bold ${hasHighIOB ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {iobData?.totalIOB || 0}u
          </span>
        </div>

        {/* Breakdown */}
        {(iobData?.rapidActingIOB || 0) > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-slate-400">Rapid-acting:</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {iobData?.rapidActingIOB}u
            </span>
          </div>
        )}

        {(iobData?.shortActingIOB || 0) > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-slate-400">Short-acting:</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {iobData?.shortActingIOB}u
            </span>
          </div>
        )}

        {/* Warning for high IOB */}
        {hasHighIOB && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-200 text-xs">
            ⚠️ High insulin on board. Consider reducing correction doses.
          </div>
        )}

        {/* Active logs details */}
        {showDetails && iobData?.logs && iobData.logs.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-600">
            <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">
              Active Doses
            </h4>
            <div className="space-y-2">
              {iobData.logs.map((activeLog, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-gray-600 dark:text-slate-400">
                      {new Date(activeLog.log.taken_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-slate-100">
                      {activeLog.remainingUnits}u remaining
                    </div>
                    <div className="text-gray-500 dark:text-slate-500">
                      {activeLog.hoursRemaining}h left
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No active insulin */}
        {(!iobData?.logs || iobData.logs.length === 0) && (
          <div className="text-center py-2">
            <TrendingDown className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-slate-500">
              No active insulin detected
            </p>
          </div>
        )}
      </div>
    </div>
  );
}