'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'indigo';
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  subtitle?: string;
  onClick?: () => void;
}

interface EnhancedStatsGridProps {
  stats: {
    totalSensors: number;
    activeSensors: number;
    successRate: number;
    problematicSensors: number;
    sensorTrend?: number;
    lastMonthSensors?: number;
    thisMonthSensors?: number;
  };
}

const colorClasses = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    text: 'text-white',
    shadow: 'shadow-blue-500/25',
    hover: 'hover:from-blue-600 hover:to-blue-700',
    ring: 'ring-blue-500/20'
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    text: 'text-white',
    shadow: 'shadow-green-500/25',
    hover: 'hover:from-green-600 hover:to-green-700',
    ring: 'ring-green-500/20'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    text: 'text-white',
    shadow: 'shadow-purple-500/25',
    hover: 'hover:from-purple-600 hover:to-purple-700',
    ring: 'ring-purple-500/20'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-red-600',
    text: 'text-white',
    shadow: 'shadow-red-500/25',
    hover: 'hover:from-red-600 hover:to-red-700',
    ring: 'ring-red-500/20'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    text: 'text-white',
    shadow: 'shadow-orange-500/25',
    hover: 'hover:from-orange-600 hover:to-orange-700',
    ring: 'ring-orange-500/20'
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    text: 'text-white',
    shadow: 'shadow-indigo-500/25',
    hover: 'hover:from-indigo-600 hover:to-indigo-700',
    ring: 'ring-indigo-500/20'
  }
};

function StatCard({ title, value, icon, color, trend, subtitle, onClick }: StatCardProps) {
  const colorClass = colorClasses[color];
  
  return (
    <div 
      className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
        onClick ? 'hover:shadow-xl' : ''
      }`}
      onClick={onClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className={`p-3 rounded-xl ${colorClass.bg} ${colorClass.text} ${colorClass.shadow} transform group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>

        {trend && (
          <div className="flex items-center justify-between">
            <div className={`flex items-center text-sm font-medium ${
              trend.isPositive 
                ? 'text-green-600 dark:text-green-400' 
                : trend.value === 0 
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-red-600 dark:text-red-400'
            }`}>
              {trend.value > 0 && trend.isPositive && <TrendingUp className="w-4 h-4 mr-1" />}
              {trend.value > 0 && !trend.isPositive && <TrendingDown className="w-4 h-4 mr-1" />}
              {trend.value === 0 && <Minus className="w-4 h-4 mr-1" />}
              {trend.value === 0 ? 'No change' : `${Math.abs(trend.value)}%`}
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-500">
              {trend.label}
            </span>
          </div>
        )}

        {/* Hover effect overlay */}
        <div className={`absolute inset-0 rounded-2xl ${colorClass.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      </div>
    </div>
  );
}

export function EnhancedStatsGrid({ stats }: EnhancedStatsGridProps) {
  const {
    totalSensors,
    activeSensors,
    successRate,
    problematicSensors,
    sensorTrend,
    lastMonthSensors,
    thisMonthSensors
  } = stats;

  // Calculate trend for success rate
  const successRateTrend = totalSensors > 0 ? {
    value: Math.round(successRate),
    isPositive: successRate >= 80,
    label: successRate >= 90 ? 'Excellent' : successRate >= 80 ? 'Good' : 'Needs improvement'
  } : undefined;

  // Calculate sensor trend
  const monthlyTrend = sensorTrend !== undefined ? {
    value: Math.abs(Math.round(sensorTrend)),
    isPositive: sensorTrend >= 0,
    label: 'vs last month'
  } : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Sensors"
        value={totalSensors}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        color="blue"
        subtitle="All time"
        trend={monthlyTrend}
        onClick={() => window.location.href = '/dashboard/sensors'}
      />

      <StatCard
        title="Active Sensors"
        value={activeSensors}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="green"
        subtitle="Currently working"
        trend={activeSensors > 0 ? {
          value: 100,
          isPositive: true,
          label: 'Active now'
        } : undefined}
        onClick={() => window.location.href = '/dashboard/sensors?filter=active'}
      />

      <StatCard
        title="Success Rate"
        value={`${Math.round(successRate)}%`}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
        color="purple"
        subtitle="Performance"
        trend={successRateTrend}
        onClick={() => window.location.href = '/dashboard/analytics'}
      />

      <StatCard
        title={problematicSensors > 0 ? "Issues" : "All Good"}
        value={problematicSensors}
        icon={
          problematicSensors > 0 ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        }
        color={problematicSensors > 0 ? "red" : "green"}
        subtitle={problematicSensors > 0 ? "Need attention" : "No issues"}
        trend={problematicSensors === 0 ? {
          value: 0,
          isPositive: true,
          label: 'Perfect!'
        } : undefined}
        onClick={() => window.location.href = problematicSensors > 0 ? '/dashboard/sensors?filter=problematic' : '/dashboard/sensors'}
      />
    </div>
  );
}