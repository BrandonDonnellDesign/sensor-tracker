'use client';

import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'avatar' | 'button' | 'chart';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ 
  variant = 'card', 
  count = 1, 
  className 
}: LoadingSkeletonProps) {
  const skeletonClasses = cn(
    'animate-pulse bg-gray-200 dark:bg-slate-700 rounded',
    className
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-3">
              <div className={cn(skeletonClasses, 'w-10 h-10 rounded-full')} />
              <div className="flex-1 space-y-2">
                <div className={cn(skeletonClasses, 'h-4 w-3/4')} />
                <div className={cn(skeletonClasses, 'h-3 w-1/2')} />
              </div>
              <div className={cn(skeletonClasses, 'w-16 h-6 rounded-full')} />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <div className={cn(skeletonClasses, 'h-4 w-full')} />
            <div className={cn(skeletonClasses, 'h-4 w-5/6')} />
            <div className={cn(skeletonClasses, 'h-4 w-4/6')} />
          </div>
        );

      case 'avatar':
        return (
          <div className={cn(skeletonClasses, 'w-12 h-12 rounded-full')} />
        );

      case 'button':
        return (
          <div className={cn(skeletonClasses, 'h-11 w-24 rounded-xl')} />
        );

      case 'chart':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className={cn(skeletonClasses, 'h-6 w-1/3 mb-4')} />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-end space-x-2">
                  <div className={cn(skeletonClasses, `h-${8 + i * 2} w-8`)} />
                  <div className={cn(skeletonClasses, `h-${12 - i} w-8`)} />
                  <div className={cn(skeletonClasses, `h-${6 + i * 3} w-8`)} />
                  <div className={cn(skeletonClasses, `h-${10 + i} w-8`)} />
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className={cn(skeletonClasses, 'h-20 w-full')} />
        );
    }
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}