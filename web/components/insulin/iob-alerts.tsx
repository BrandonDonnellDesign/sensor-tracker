'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { 
  calculateIOB,
  getInsulinDuration,
  type InsulinDose,
} from '@/lib/iob-calculator';
import { AlertTriangle, Bell, X, CheckCircle } from 'lucide-react';

interface IOBAlert {
  id: string;
  type: 'high' | 'warning' | 'info';
  message: string;
  iob: number;
  timestamp: Date;
}

interface IOBAlertsProps {
  className?: string;
}

export function IOBAlerts({ className = '' }: IOBAlertsProps) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<IOBAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    
    checkIOB();
    // Check every 10 minutes
    const interval = setInterval(checkIOB, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const checkIOB = async () => {
    if (!user) return;

    try {
      const supabase = createClient();
      
      // Get recent bolus insulin (last 8 hours)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 8);
      
      const { data: logs, error } = await supabase
        .from('all_insulin_delivery')
        .select('id, units, insulin_type, taken_at')
        .eq('user_id', user.id)
        .gte('taken_at', cutoffTime.toISOString())
        .neq('delivery_type', 'basal')
        .in('insulin_type', ['rapid', 'short']);

      if (error) throw error;

      // Calculate current IOB using tested utility
      const now = new Date();
      const iobDoses: InsulinDose[] = (logs || []).filter(log => log.units && log.taken_at).map(log => ({
        id: log.id || `${log.taken_at}-${log.units}`,
        amount: log.units!,
        timestamp: new Date(log.taken_at!),
        insulinType: log.insulin_type as 'rapid' | 'short' | 'intermediate' | 'long',
        duration: getInsulinDuration(log.insulin_type as any),
      }));

      const iobResult = calculateIOB(iobDoses, now);
      const currentIOB = iobResult.totalIOB;

      // Generate alerts based on IOB levels
      const newAlerts: IOBAlert[] = [];

      if (currentIOB >= 5) {
        newAlerts.push({
          id: `high-iob-${Date.now()}`,
          type: 'high',
          message: `High IOB detected: ${currentIOB}u. Consider delaying correction doses.`,
          iob: currentIOB,
          timestamp: now
        });
      } else if (currentIOB >= 3) {
        newAlerts.push({
          id: `warning-iob-${Date.now()}`,
          type: 'warning',
          message: `Moderate IOB: ${currentIOB}u. Be cautious with additional insulin.`,
          iob: currentIOB,
          timestamp: now
        });
      }

      // Check for stacking (multiple doses within 2 hours)
      const recentDoses = logs?.filter(log => log.taken_at).filter(log => {
        const logTime = new Date(log.taken_at!);
        const hoursAgo = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
        return hoursAgo < 2;
      });

      if (recentDoses && recentDoses.length >= 3) {
        newAlerts.push({
          id: `stacking-${Date.now()}`,
          type: 'warning',
          message: `${recentDoses.length} doses in the last 2 hours. Watch for insulin stacking.`,
          iob: currentIOB,
          timestamp: now
        });
      }

      // Filter out dismissed alerts
      const activeAlerts = newAlerts.filter(alert => !dismissed.has(alert.id));
      setAlerts(activeAlerts);

    } catch (error) {
      console.error('Error checking IOB:', error);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissed(prev => new Set(prev).add(alertId));
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const dismissAll = () => {
    alerts.forEach(alert => dismissAlert(alert.id));
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
            IOB Alerts
          </span>
        </div>
        {alerts.length > 1 && (
          <button
            onClick={dismissAll}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Dismiss All
          </button>
        )}
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`flex items-start space-x-3 p-4 rounded-lg border ${
              alert.type === 'high'
                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                : alert.type === 'warning'
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {alert.type === 'high' ? (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : alert.type === 'warning' ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                alert.type === 'high'
                  ? 'text-red-800 dark:text-red-200'
                  : alert.type === 'warning'
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {alert.message}
              </p>
              <p className={`text-xs mt-1 ${
                alert.type === 'high'
                  ? 'text-red-600 dark:text-red-300'
                  : alert.type === 'warning'
                  ? 'text-amber-600 dark:text-amber-300'
                  : 'text-blue-600 dark:text-blue-300'
              }`}>
                {alert.timestamp.toLocaleTimeString()}
              </p>
            </div>

            <button
              onClick={() => dismissAlert(alert.id)}
              className={`flex-shrink-0 p-1 rounded-md transition-colors ${
                alert.type === 'high'
                  ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'
                  : alert.type === 'warning'
                  ? 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}