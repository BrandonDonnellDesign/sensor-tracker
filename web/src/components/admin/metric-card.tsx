'use client';

import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  gray: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20',
};

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  color = 'blue',
  size = 'md' 
}: MetricCardProps) {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const valueSize = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 ${sizeClasses[size]}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
            {title}
          </p>
          <p className={`${valueSize[size]} font-bold text-gray-900 dark:text-slate-100`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${
                change.type === 'increase' 
                  ? 'text-green-600 dark:text-green-400' 
                  : change.type === 'decrease'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {change.type === 'increase' ? '+' : change.type === 'decrease' ? '-' : ''}{Math.abs(change.value)}{change.period.includes('%') ? '' : '%'}
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-500 ml-1">
                {change.type === 'neutral' ? change.period : `vs ${change.period}`}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}