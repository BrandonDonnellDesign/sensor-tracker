'use client';

import { ReactNode } from 'react';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveGrid({ children, className = '' }: ResponsiveGridProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4;
}

export function ResponsiveCard({ children, className = '', span = 1 }: ResponsiveCardProps) {
  const spanClasses = {
    1: '',
    2: 'lg:col-span-2',
    3: 'xl:col-span-3',
    4: '2xl:col-span-4'
  };

  return (
    <div className={`${spanClasses[span]} ${className}`}>
      {children}
    </div>
  );
}