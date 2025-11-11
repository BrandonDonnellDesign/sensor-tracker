'use client';

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileOptimizedCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
  status?: 'success' | 'warning' | 'error';
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileOptimizedCard({
  title,
  subtitle,
  icon,
  badge,
  status,
  children,
  onClick,
  className
}: MobileOptimizedCardProps) {
  const isClickable = !!onClick;

  const statusColors = {
    success: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 shadow-sm',
    warning: 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30',
    error: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30'
  };

  const statusDotColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  const badgeColors = {
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white'
  };
  
  // Special badge colors based on badge text
  const getBadgeColor = () => {
    if (!badge) return '';
    if (status) return badgeColors[status];
    
    // Custom colors for specific badge text
    if (badge === 'Active') return 'bg-green-500 text-white';
    if (badge === 'Inactive') return 'bg-gray-400 text-white';
    if (badge === 'Issue') return 'bg-red-500 text-white';
    
    return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300';
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4',
        'transition-all duration-200',
        status && statusColors[status],
        isClickable && 'cursor-pointer hover:shadow-md active:scale-[0.98] active:shadow-sm',
        'min-h-[60px] flex flex-col justify-center',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Icon */}
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                {title}
              </h3>
              
              {/* Status Dot */}
              {status && (
                <div className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  statusDotColors[status]
                )} />
              )}
            </div>
            
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Badge */}
          {badge && (
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              getBadgeColor()
            )}>
              {badge}
            </span>
          )}

          {/* Chevron for clickable cards */}
          {isClickable && (
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500" />
          )}
        </div>
      </div>

      {/* Additional Content */}
      {children && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  );
}