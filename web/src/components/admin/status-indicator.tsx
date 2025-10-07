'use client';

interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'error' | 'degraded' | 'down';
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  healthy: {
    color: 'bg-green-500',
    textColor: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    label: 'Healthy'
  },
  warning: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    label: 'Warning'
  },
  error: {
    color: 'bg-red-500',
    textColor: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    label: 'Error'
  },
  degraded: {
    color: 'bg-orange-500',
    textColor: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    label: 'Degraded'
  },
  down: {
    color: 'bg-red-600',
    textColor: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    label: 'Down'
  }
};

export function StatusIndicator({ status, label, size = 'md' }: StatusIndicatorProps) {
  const config = statusConfig[status];
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`${sizeClasses[size]} ${config.color} rounded-full`} />
      <span className={`text-sm font-medium ${config.textColor}`}>
        {label}
      </span>
    </div>
  );
}