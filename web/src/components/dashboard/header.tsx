'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/sensors': 'My Sensors',
  '/dashboard/sensors/new': 'Add New Sensor',
  '/dashboard/profile': 'Profile',
};

export function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const pageName = pageNames[pathname] || 'Dashboard';

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-800/50 lg:pl-0 pl-16 transition-all duration-200 sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 lg:hidden">
              {pageName}
            </h1>
          </div>
          
          {/* Header actions */}
          <div className="flex items-center space-x-4">
            {/* Future: notifications, search, etc. */}
          </div>
        </div>
      </div>
    </header>
  );
}