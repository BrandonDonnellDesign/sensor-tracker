'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Database } from '@/lib/database.types';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Calendar,
  Award,
  Target,
  ChevronRight
} from 'lucide-react';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensor_models?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
};

interface QuickInsightsProps {
  sensors: Sensor[];
}

interface InsightCard {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function QuickInsights({ sensors }: QuickInsightsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const insights = useMemo(() => {
    if (sensors.length === 0) return [];

    const now = new Date();
    const insights: InsightCard[] = [];

    // Brand Analysis
    const brandStats = sensors.reduce((acc, sensor) => {
      const brand = sensor.sensor_models?.manufacturer || 'Unknown';
      if (!acc[brand]) {
        acc[brand] = { total: 0, problematic: 0 };
      }
      acc[brand].total++;
      if (sensor.is_problematic) {
        acc[brand].problematic++;
      }
      return acc;
    }, {} as Record<string, { total: number; problematic: number }>);

    const topBrand = Object.entries(brandStats)
      .sort(([, a], [, b]) => b.total - a.total)[0];

    if (topBrand) {
      const [brandName, stats] = topBrand;
      const successRate = ((stats.total - stats.problematic) / stats.total) * 100;
      
      insights.push({
        title: 'Top Brand',
        value: brandName,
        description: `${stats.total} sensors, ${Math.round(successRate)}% success rate`,
        icon: <Award className="w-5 h-5" />,
        color: 'bg-gradient-to-r from-blue-500 to-blue-600',
        trend: {
          value: Math.round(successRate),
          isPositive: successRate >= 80
        }
      });
    }

    // Average Duration Analysis - calculate actual wear time
    const sortedSensors = [...sensors].sort((a, b) => 
      new Date(a.date_added).getTime() - new Date(b.date_added).getTime()
    );
    
    const actualDurations: number[] = [];
    
    // Calculate actual durations between consecutive sensors
    for (let i = 0; i < sortedSensors.length - 1; i++) {
      const currentSensor = sortedSensors[i];
      const nextSensor = sortedSensors[i + 1];
      
      const startDate = new Date(currentSensor.date_added);
      const endDate = new Date(nextSensor.date_added);
      const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only include reasonable durations (1-30 days)
      if (duration >= 1 && duration <= 30) {
        actualDurations.push(duration);
      }
    }
    
    // Add problematic sensor durations
    sensors.forEach(sensor => {
      if (sensor.is_problematic) {
        const daysSinceAdded = Math.floor(
          (now.getTime() - new Date(sensor.date_added).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceAdded <= 14) {
          actualDurations.push(daysSinceAdded);
        }
      }
    });

    if (actualDurations.length > 0) {
      const avgDuration = actualDurations.reduce((acc, duration) => acc + duration, 0) / actualDurations.length;

      insights.push({
        title: 'Avg Duration',
        value: `${avgDuration.toFixed(1)} days`,
        description: `Based on ${actualDurations.length} completed sensors`,
        icon: <Calendar className="w-5 h-5" />,
        color: 'bg-gradient-to-r from-green-500 to-green-600',
        trend: {
          value: Math.round(avgDuration),
          isPositive: avgDuration >= 8
        }
      });
    }

    // Monthly Trend Analysis with Period Selection
    const getPeriodData = () => {
      const now = new Date();
      let periodStart: Date;
      let previousPeriodStart: Date;
      let periodLabel: string;
      
      switch (selectedPeriod) {
        case 'week':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          previousPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
          periodLabel = 'this week';
          break;
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          periodStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
          previousPeriodStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
          periodLabel = 'this quarter';
          break;
        default: // month
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          periodLabel = 'this month';
      }
      
      const currentPeriodSensors = sensors.filter(sensor => {
        const sensorDate = new Date(sensor.date_added);
        return sensorDate >= periodStart;
      });
      
      const previousPeriodSensors = sensors.filter(sensor => {
        const sensorDate = new Date(sensor.date_added);
        return sensorDate >= previousPeriodStart && sensorDate < periodStart;
      });
      
      return {
        current: currentPeriodSensors.length,
        previous: previousPeriodSensors.length,
        label: periodLabel
      };
    };

    const periodData = getPeriodData();
    
    if (periodData.previous > 0 || periodData.current > 0) {
      const periodChange = periodData.previous > 0 
        ? ((periodData.current - periodData.previous) / periodData.previous) * 100
        : periodData.current > 0 ? 100 : 0;
      
      insights.push({
        title: `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Trend`,
        value: `${periodData.current} sensors`,
        description: `${periodData.label} vs previous period`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'bg-gradient-to-r from-purple-500 to-purple-600',
        trend: {
          value: Math.abs(Math.round(periodChange)),
          isPositive: periodChange >= 0
        }
      });
    }

    // Reliability Score
    const totalSensors = sensors.length;
    const problematicSensors = sensors.filter(s => s.is_problematic).length;
    const reliabilityScore = totalSensors > 0 ? ((totalSensors - problematicSensors) / totalSensors) * 100 : 0;

    insights.push({
      title: 'Reliability',
      value: `${Math.round(reliabilityScore)}%`,
      description: `${totalSensors - problematicSensors}/${totalSensors} sensors working well`,
      icon: <Target className="w-5 h-5" />,
      color: reliabilityScore >= 90 ? 'bg-gradient-to-r from-green-500 to-green-600' : 
             reliabilityScore >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
             'bg-gradient-to-r from-red-500 to-red-600',
      trend: {
        value: Math.round(reliabilityScore),
        isPositive: reliabilityScore >= 80
      }
    });

    // Duration Performance Analysis
    const durationStats = sensors.reduce((acc, sensor) => {
      const expectedDays = sensor.sensor_models?.duration_days || 10;
      const category = expectedDays >= 14 ? '14+ days' : expectedDays >= 10 ? '10-13 days' : 'Under 10 days';
      
      if (!acc[category]) {
        acc[category] = { total: 0, problematic: 0 };
      }
      acc[category].total++;
      if (sensor.is_problematic) {
        acc[category].problematic++;
      }
      return acc;
    }, {} as Record<string, { total: number; problematic: number }>);

    const bestDurationCategory = Object.entries(durationStats)
      .map(([category, stats]) => ({
        category,
        successRate: ((stats.total - stats.problematic) / stats.total) * 100,
        total: stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate)[0];

    if (bestDurationCategory && bestDurationCategory.total > 0) {
      insights.push({
        title: 'Best Duration',
        value: bestDurationCategory.category,
        description: `${Math.round(bestDurationCategory.successRate)}% success rate (${bestDurationCategory.total} sensors)`,
        icon: <Calendar className="w-5 h-5" />,
        color: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
        trend: {
          value: Math.round(bestDurationCategory.successRate),
          isPositive: bestDurationCategory.successRate >= 80
        }
      });
    }

    return insights;
  }, [sensors, selectedPeriod]);

  if (sensors.length === 0) {
    return (
      <div className="bg-[#1e293b] rounded-lg p-6 border border-slate-700/30">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Quick Insights</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">Data-driven sensor analytics</p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 mb-2">No insights available</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">
            Add more sensors to see analytics and trends
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e293b] rounded-lg p-6 border border-slate-700/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Quick Insights</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">Data-driven sensor analytics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter')}
            className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <div className="text-xs text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
            {Math.round(((sensors.length - sensors.filter(s => s.is_problematic).length) / sensors.length) * 100)}% success
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="relative group p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`${insight.color} p-2 rounded-lg text-white`}>
                    {insight.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                      {insight.title}
                    </p>
                  </div>
                </div>
                
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                  {insight.value}
                </p>
                
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  {insight.description}
                </p>
              </div>
              
              {insight.trend && (
                <div className={`text-right ${
                  insight.trend.isPositive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className={`w-4 h-4 ${!insight.trend.isPositive ? 'rotate-180' : ''}`} />
                    <span className="text-sm font-medium">
                      {insight.trend.value}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Real Data Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Brand Usage Distribution */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">Brand Distribution</h4>
            <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="space-y-3">
            {Object.entries(sensors.reduce((acc, sensor) => {
              const brand = sensor.sensor_models?.manufacturer || 'Unknown';
              acc[brand] = (acc[brand] || 0) + 1;
              return acc;
            }, {} as Record<string, number>))
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([brand, count]) => {
                const percentage = Math.round((count / sensors.length) * 100);
                return (
                  <div key={brand} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-800 dark:text-blue-300">{brand}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">{percentage}%</span>
                        <span className="text-xs text-blue-500 dark:text-blue-500">({count})</span>
                      </div>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                      <div 
                        className="bg-blue-600 dark:bg-blue-400 rounded-full h-2 transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Success Rate Analysis */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-green-900 dark:text-green-300">Performance Breakdown</h4>
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="space-y-3">
            {(() => {
              const totalSensors = sensors.length;
              const successfulSensors = sensors.filter(s => !s.is_problematic).length;
              const problematicSensors = sensors.filter(s => s.is_problematic).length;
              const successPercentage = Math.round((successfulSensors / totalSensors) * 100);
              const problemPercentage = Math.round((problematicSensors / totalSensors) * 100);
              
              return (
                <>
                  {/* Success Rate */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-green-800 dark:text-green-300">Successful</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-green-600 dark:text-green-400 font-bold">{successPercentage}%</span>
                        <span className="text-xs text-green-500 dark:text-green-500">({successfulSensors})</span>
                      </div>
                    </div>
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                      <div 
                        className="bg-green-600 dark:bg-green-400 rounded-full h-2 transition-all duration-700"
                        style={{ width: `${successPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Problem Rate */}
                  {problematicSensors > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-red-800 dark:text-red-300">Issues</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-red-600 dark:text-red-400 font-bold">{problemPercentage}%</span>
                          <span className="text-xs text-red-500 dark:text-red-500">({problematicSensors})</span>
                        </div>
                      </div>
                      <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-2">
                        <div 
                          className="bg-red-600 dark:bg-red-400 rounded-full h-2 transition-all duration-700"
                          style={{ width: `${problemPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Overall Score */}
                  <div className="pt-2 border-t border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-green-900 dark:text-green-100">Overall Score</span>
                      <span className={`text-sm font-bold ${
                        successPercentage >= 90 ? 'text-green-600 dark:text-green-400' :
                        successPercentage >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {successPercentage}%
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Action Links */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/analytics"
            className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium group"
          >
            Detailed Analytics
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link
            href="/dashboard/sensors?view=insights"
            className="flex items-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium group"
          >
            Sensor Insights
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-slate-500">
          Based on {sensors.length} sensor{sensors.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}