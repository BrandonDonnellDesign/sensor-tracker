'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useInsulinCalculatorSettings } from '@/lib/hooks/use-insulin-calculator-settings';
import { createClient } from '@/lib/supabase-client';
import { 
  calculateIOB,
  getInsulinDuration,
  type InsulinDose as IOBInsulinDose,
} from '@/lib/iob-calculator';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { Activity, Clock, TrendingDown, Info } from 'lucide-react';

interface InsulinLog {
  id: string;
  units: number;
  taken_at: string;
  insulin_type: 'rapid' | 'short';
  insulin_name?: string;
}

interface IOBDecayPoint {
  time: string;
  minutesFromNow: number;
  totalIOB: number;
  rapidIOB: number;
  shortIOB: number;
  formattedTime: string;
}

interface IOBDecayChartProps {
  className?: string;
}

export function IOBDecayChart({ className = '' }: IOBDecayChartProps) {
  const { user } = useAuth();
  const { settings } = useInsulinCalculatorSettings();
  const [decayData, setDecayData] = useState<IOBDecayPoint[]>([]);
  const [activeDoses, setActiveDoses] = useState<InsulinLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !settings) return;
    
    calculateIOBDecay();
    // Refresh every 5 minutes
    const interval = setInterval(calculateIOBDecay, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, settings]);

  const calculateIOBDecay = async () => {
    if (!user || !settings) return;

    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get bolus insulin logs from the last 8 hours
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 8);
      
      const { data: logs, error } = await supabase
        .from('insulin_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('taken_at', cutoffTime.toISOString())
        .neq('delivery_type', 'basal')
        .in('insulin_type', ['rapid', 'short'])
        .order('taken_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const activeLogs = (logs || []).filter(log => {
        const logTime = new Date(log.taken_at);
        const hoursElapsed = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
        const actionTime = log.insulin_type === 'short' ? 6 : 4;
        return hoursElapsed < actionTime;
      });

      setActiveDoses(activeLogs as InsulinLog[]);

      // Convert logs to IOB calculator format
      const iobDoses: IOBInsulinDose[] = activeLogs.map(log => ({
        id: log.id,
        amount: log.units,
        timestamp: new Date(log.taken_at),
        insulinType: log.insulin_type as 'rapid' | 'short' | 'intermediate' | 'long',
        duration: getInsulinDuration(log.insulin_type as any),
      }));

      // Generate decay curve data points (every 15 minutes for next 6 hours)
      const decayPoints: IOBDecayPoint[] = [];
      const maxMinutes = 360; // 6 hours
      
      for (let minutes = 0; minutes <= maxMinutes; minutes += 15) {
        const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
        
        // Use tested IOB calculator with exponential decay
        const iobResult = calculateIOB(iobDoses, futureTime);
        
        // Calculate type-specific IOB
        let rapidIOB = 0;
        let shortIOB = 0;
        
        iobResult.doses.forEach((dose, index) => {
          const log = activeLogs[index];
          if (dose.remainingAmount > 0) {
            if (log.insulin_type === 'rapid') {
              rapidIOB += dose.remainingAmount;
            } else if (log.insulin_type === 'short') {
              shortIOB += dose.remainingAmount;
            }
          }
        });

        decayPoints.push({
          time: futureTime.toISOString(),
          minutesFromNow: minutes,
          totalIOB: Math.round(iobResult.totalIOB * 100) / 100,
          rapidIOB: Math.round(rapidIOB * 100) / 100,
          shortIOB: Math.round(shortIOB * 100) / 100,
          formattedTime: minutes === 0 ? 'Now' : `+${Math.floor(minutes / 60)}h ${minutes % 60}m`
        });
      }

      setDecayData(decayPoints);

    } catch (error) {
      console.error('Error calculating IOB decay:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-1/3"></div>
          <div className="h-48 bg-gray-200 dark:bg-slate-600 rounded"></div>
        </div>
      </div>
    );
  }

  const hasActiveInsulin = decayData.some(point => point.totalIOB > 0);
  const currentIOB = decayData[0]?.totalIOB || 0;
  const peakIOB = Math.max(...decayData.map(p => p.totalIOB));
  const timeToZero = decayData.findIndex(p => p.totalIOB === 0);
  const hoursToZero = timeToZero > 0 ? (timeToZero * 15) / 60 : 0;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              IOB Decay Curve
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Active insulin over time (bolus only)
            </p>
          </div>
        </div>
        
        {hasActiveInsulin && (
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {currentIOB}u
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-500">
              Current IOB
            </p>
          </div>
        )}
      </div>

      {hasActiveInsulin ? (
        <>
          {/* Chart */}
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={decayData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="totalIOBGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="rapidIOBGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="shortIOBGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="minutesFromNow"
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                  tickFormatter={(value) => {
                    const hours = Math.floor(value / 60);
                    return hours === 0 ? 'Now' : `+${hours}h`;
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                  label={{ value: 'IOB (U)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as IOBDecayPoint;
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">
                            {data.formattedTime}
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-blue-600">Total IOB:</span>
                              <span className="text-sm font-medium">{data.totalIOB}u</span>
                            </div>
                            {data.rapidIOB > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-cyan-600">Rapid:</span>
                                <span className="text-sm font-medium">{data.rapidIOB}u</span>
                              </div>
                            )}
                            {data.shortIOB > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-purple-600">Short:</span>
                                <span className="text-sm font-medium">{data.shortIOB}u</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="totalIOB" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#totalIOBGradient)"
                  name="Total IOB"
                />
                {decayData.some(p => p.rapidIOB > 0) && (
                  <Line 
                    type="monotone" 
                    dataKey="rapidIOB" 
                    stroke="#06b6d4" 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Rapid-Acting"
                  />
                )}
                {decayData.some(p => p.shortIOB > 0) && (
                  <Line 
                    type="monotone" 
                    dataKey="shortIOB" 
                    stroke="#8b5cf6" 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Short-Acting"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                Peak IOB
              </p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {peakIOB}u
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                Time to Zero
              </p>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {hoursToZero > 0 ? `${hoursToZero.toFixed(1)}h` : 'N/A'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3">
              <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                Active Doses
              </p>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                {activeDoses.length}
              </p>
            </div>
          </div>

          {/* Active Doses List */}
          {activeDoses.length > 0 && (
            <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                Active Doses Contributing to IOB
              </h4>
              <div className="space-y-2">
                {activeDoses.slice(0, 5).map((dose) => {
                  const doseTime = new Date(dose.taken_at);
                  const minutesAgo = Math.floor((Date.now() - doseTime.getTime()) / (1000 * 60));
                  const hoursAgo = Math.floor(minutesAgo / 60);
                  const remainingMinutes = minutesAgo % 60;
                  
                  return (
                    <div key={dose.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-slate-700 rounded-lg p-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          dose.insulin_type === 'rapid' 
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        }`}>
                          {dose.insulin_type}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          {dose.units}u
                        </span>
                      </div>
                      <span className="text-gray-600 dark:text-slate-400">
                        {hoursAgo > 0 ? `${hoursAgo}h ${remainingMinutes}m ago` : `${remainingMinutes}m ago`}
                      </span>
                    </div>
                  );
                })}
                {activeDoses.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-slate-500 text-center">
                    +{activeDoses.length - 5} more doses
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-200">
                This curve shows how your active bolus insulin decays over time using an exponential decay model. 
                Basal insulin is excluded as it provides constant background coverage.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <TrendingDown className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-500 text-sm">
            No active insulin detected
          </p>
          <p className="text-gray-400 dark:text-slate-600 text-xs mt-1">
            IOB curve will appear after taking bolus insulin
          </p>
        </div>
      )}
    </div>
  );
}