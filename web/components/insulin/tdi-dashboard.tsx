'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Droplets, Activity } from 'lucide-react';

interface DailyInsulinData {
  date: string;
  bolus: number;
  basal: number;
  total: number;
  formattedDate: string;
}

interface TDIStats {
  weeklyAverage: number;
  monthlyAverage: number;
  basalPercentage: number;
  bolusPercentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface TDIDashboardProps {
  className?: string;
}

export function TDIDashboard({ className = '' }: TDIDashboardProps) {
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<DailyInsulinData[]>([]);
  const [stats, setStats] = useState<TDIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(14);

  useEffect(() => {
    if (user) {
      fetchTDIData();
    }
  }, [user, selectedPeriod]);

  const fetchTDIData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get insulin logs for the selected period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - selectedPeriod);
      startDate.setHours(0, 0, 0, 0);

      const { data: logs, error } = await supabase
        .from('all_insulin_delivery')
        .select('units, delivery_type, taken_at')
        .eq('user_id', user.id)
        .gte('taken_at', startDate.toISOString())
        .order('taken_at', { ascending: true });

      if (error) throw error;

      // Group by date and calculate daily totals
      const dailyTotals = new Map<string, { bolus: number; basal: number }>();
      
      logs?.filter(log => log.taken_at && log.units).forEach(log => {
        const date = new Date(log.taken_at!).toISOString().split('T')[0];
        const current = dailyTotals.get(date) || { bolus: 0, basal: 0 };
        
        if (log.delivery_type === 'basal') {
          current.basal += log.units!;
        } else {
          current.bolus += log.units!;
        }
        
        dailyTotals.set(date, current);
      });

      // Convert to array and fill missing days
      const dailyArray: DailyInsulinData[] = [];
      for (let i = selectedPeriod - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const data = dailyTotals.get(dateStr) || { bolus: 0, basal: 0 };
        
        dailyArray.push({
          date: dateStr,
          bolus: Math.round(data.bolus * 10) / 10,
          basal: Math.round(data.basal * 10) / 10,
          total: Math.round((data.bolus + data.basal) * 10) / 10,
          formattedDate: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })
        });
      }

      setDailyData(dailyArray);

      // Calculate statistics
      const totalInsulin = dailyArray.reduce((sum, day) => sum + day.total, 0);
      const totalBolus = dailyArray.reduce((sum, day) => sum + day.bolus, 0);
      const totalBasal = dailyArray.reduce((sum, day) => sum + day.basal, 0);
      const daysWithData = dailyArray.filter(day => day.total > 0).length;

      // Calculate trend (compare first half vs second half)
      const midPoint = Math.floor(dailyArray.length / 2);
      const firstHalf = dailyArray.slice(0, midPoint);
      const secondHalf = dailyArray.slice(midPoint);
      const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.total, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.total, 0) / secondHalf.length;
      const trendDiff = secondHalfAvg - firstHalfAvg;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(trendDiff) > 2) {
        trend = trendDiff > 0 ? 'up' : 'down';
      }

      setStats({
        weeklyAverage: daysWithData > 0 ? Math.round((totalInsulin / daysWithData) * 10) / 10 : 0,
        monthlyAverage: daysWithData > 0 ? Math.round((totalInsulin / daysWithData) * 10) / 10 : 0,
        basalPercentage: totalInsulin > 0 ? Math.round((totalBasal / totalInsulin) * 100) : 0,
        bolusPercentage: totalInsulin > 0 ? Math.round((totalBolus / totalInsulin) * 100) : 0,
        trend
      });

    } catch (error) {
      console.error('Error fetching TDI data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 dark:bg-slate-600 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 dark:bg-slate-600 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-slate-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Total Daily Insulin (TDI)
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Daily bolus + basal insulin totals
            </p>
          </div>
        </div>
        
        {/* Period Selector */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          {[7, 14, 30].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period as 7 | 14 | 30)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              {period}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#64748b"
              label={{ value: 'Units', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as DailyInsulinData;
                  return (
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-gray-900 dark:text-slate-100">{label}</p>
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-600">Bolus:</span>
                          <span className="text-sm font-medium">{data.bolus}u</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-orange-600">Basal:</span>
                          <span className="text-sm font-medium">{data.basal}u</span>
                        </div>
                        <div className="flex items-center justify-between border-t pt-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">Total:</span>
                          <span className="text-sm font-bold">{data.total}u</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="bolus" stackId="insulin" fill="#3b82f6" radius={[0, 0, 4, 4]} />
            <Bar dataKey="basal" stackId="insulin" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                  Daily Average
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {stats.weeklyAverage}u
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                  Trend
                </p>
                <div className="flex items-center space-x-1">
                  <span className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {stats.trend === 'up' ? '↗' : stats.trend === 'down' ? '↘' : '→'}
                  </span>
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    {stats.trend === 'up' ? 'Rising' : stats.trend === 'down' ? 'Falling' : 'Stable'}
                  </span>
                </div>
              </div>
              <Calendar className="h-4 w-4 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                  Basal %
                </p>
                <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                  {stats.basalPercentage}%
                </p>
              </div>
              <Droplets className="h-4 w-4 text-orange-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                  Bolus %
                </p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                  {stats.bolusPercentage}%
                </p>
              </div>
              <Droplets className="h-4 w-4 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {dailyData.every(day => day.total === 0) && (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-500 text-sm">
            No insulin data found for the selected period
          </p>
        </div>
      )}
    </div>
  );
}