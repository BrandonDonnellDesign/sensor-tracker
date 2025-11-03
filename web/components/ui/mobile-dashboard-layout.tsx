'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileDashboardLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function MobileDashboardLayout({
  children,
  header,
  title,
  subtitle,
  actions,
  className
}: MobileDashboardLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-slate-900', className)}>
      {/* Custom Header */}
      {header && (
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          {header}
        </div>
      )}

      {/* Default Header */}
      {!header && (title || subtitle || actions) && (
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            
            {actions && (
              <div className="flex-shrink-0 ml-4">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <div className="p-4">
          {children}
        </div>
      </div>

      {/* Safe area for mobile navigation */}
      <div className="h-safe-area-inset-bottom lg:hidden" />
    </div>
  );
}