import { memo, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8',
} as const;

export const Loading = memo(function Loading({ 
  size = 'md', 
  text, 
  className = '', 
  fullScreen = false 
}: LoadingProps) {
  // Memoize the spinner classes
  const spinnerClasses = useMemo(() => 
    `${sizeClasses[size]} animate-spin text-blue-600`,
    [size]
  );

  const content = useMemo(() => (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={spinnerClasses} />
        {text && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
        )}
      </div>
    </div>
  ), [className, spinnerClasses, text]);

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
});

// Skeleton loading components
export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 space-y-3">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
      </div>
    </div>
  );
});

export const SkeletonList = memo(function SkeletonList({ count = 3 }: { count?: number }) {
  const skeletonItems = useMemo(() => 
    Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    )),
    [count]
  );

  return (
    <div className="space-y-4">
      {skeletonItems}
    </div>
  );
});

export const SkeletonTable = memo(function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  const gridStyle = useMemo(() => ({ 
    gridTemplateColumns: `repeat(${cols}, 1fr)` 
  }), [cols]);

  const headerCells = useMemo(() => 
    Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
    )),
    [cols]
  );

  const tableRows = useMemo(() => 
    Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={gridStyle}>
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div key={colIndex} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    )),
    [rows, cols, gridStyle]
  );

  return (
    <div className="animate-pulse">
      <div className="space-y-3">
        {/* Header */}
        <div className="grid gap-4" style={gridStyle}>
          {headerCells}
        </div>
        {/* Rows */}
        {tableRows}
      </div>
    </div>
  );
});