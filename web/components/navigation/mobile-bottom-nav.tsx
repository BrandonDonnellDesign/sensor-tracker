'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  Activity, 
  UtensilsCrossed,
  Syringe,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    activePattern: /^\/dashboard$/
  },
  {
    name: 'Sensors',
    href: '/dashboard/sensors',
    icon: Activity,
    activePattern: /^\/dashboard\/sensors/
  },
  {
    name: 'Food',
    href: '/dashboard/food',
    icon: UtensilsCrossed,
    activePattern: /^\/dashboard\/food/
  },
  {
    name: 'Insulin',
    href: '/dashboard/insulin',
    icon: Syringe,
    activePattern: /^\/dashboard\/insulin/
  },
  {
    name: 'Tracking',
    href: '/dashboard/replacement-tracking',
    icon: Package,
    activePattern: /^\/dashboard\/replacement-tracking/
  },

];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.activePattern.test(pathname);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all duration-200',
                  'min-w-[64px] min-h-[64px] touch-manipulation',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                )}
              >
                <Icon className={cn(
                  'transition-all duration-200 w-6 h-6',
                  isActive && 'scale-110'
                )} />
                <span className="text-xs font-medium mt-1 leading-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Safe area for devices with home indicator */}
      <div className="bg-white dark:bg-slate-800 h-safe-area-inset-bottom" />
    </div>
  );
}