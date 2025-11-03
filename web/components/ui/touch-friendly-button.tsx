'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TouchFriendlyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
}

export function TouchFriendlyButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className,
  disabled,
  ...props
}: TouchFriendlyButtonProps) {
  const baseClasses = cn(
    // Base styles
    'inline-flex items-center justify-center font-medium rounded-xl',
    'transition-all duration-200 transform',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    'active:scale-95 disabled:active:scale-100',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    // Minimum touch target size (44px)
    'min-h-[44px]',
    fullWidth && 'w-full'
  );

  const variants = {
    primary: cn(
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
      'active:bg-blue-800 active:shadow-inner',
      'disabled:bg-blue-400'
    ),
    secondary: cn(
      'bg-gray-600 hover:bg-gray-700 text-white shadow-sm',
      'active:bg-gray-800 active:shadow-inner',
      'disabled:bg-gray-400'
    ),
    outline: cn(
      'border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800',
      'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300',
      'active:bg-gray-100 dark:active:bg-slate-600 active:border-gray-400',
      'disabled:bg-gray-100 dark:disabled:bg-slate-700'
    ),
    ghost: cn(
      'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-700',
      'text-gray-700 dark:text-slate-300',
      'active:bg-gray-200 dark:active:bg-slate-600'
    ),
    danger: cn(
      'bg-red-600 hover:bg-red-700 text-white shadow-sm',
      'active:bg-red-800 active:shadow-inner',
      'disabled:bg-red-400'
    )
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm gap-2',
    md: 'px-4 py-3 text-base gap-2',
    lg: 'px-6 py-4 text-lg gap-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {/* Left Icon */}
      {icon && iconPosition === 'left' && !loading && (
        <span className={cn('flex-shrink-0', iconSizes[size])}>
          {icon}
        </span>
      )}

      {/* Loading Spinner */}
      {loading && (
        <Loader2 className={cn('animate-spin flex-shrink-0', iconSizes[size])} />
      )}

      {/* Button Text */}
      <span className={cn(
        'flex-1 text-center',
        fullWidth ? 'block' : 'inline'
      )}>
        {children}
      </span>

      {/* Right Icon */}
      {icon && iconPosition === 'right' && !loading && (
        <span className={cn('flex-shrink-0', iconSizes[size])}>
          {icon}
        </span>
      )}
    </button>
  );
}