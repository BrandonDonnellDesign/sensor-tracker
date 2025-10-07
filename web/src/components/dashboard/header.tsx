'use client';

import { usePathname } from 'next/navigation';
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SearchButton } from '@/components/dashboard/search-button';
import { NotificationsButton } from '@/components/dashboard/notifications-button';
import { UserProfileMenu } from '@/components/dashboard/user-profile-menu';

const getPageInfo = (pathname: string) => {
  const parts = pathname.split('/');
  
  // Handle admin pages
  if (parts[1] === 'admin') {
    const adminPages: Record<string, { name: string; breadcrumb: { name: string; href: string }[] }> = {
      '/admin': {
        name: 'Admin Dashboard',
        breadcrumb: [{ name: 'Admin Dashboard', href: '/admin' }]
      },
      '/admin/overview': {
        name: 'Overview',
        breadcrumb: [
          { name: 'Admin', href: '/admin' },
          { name: 'Overview', href: '/admin/overview' }
        ]
      },
      '/admin/analytics': {
        name: 'Analytics',
        breadcrumb: [
          { name: 'Admin', href: '/admin' },
          { name: 'Analytics', href: '/admin/analytics' }
        ]
      },
      '/admin/analytics/historical': {
        name: 'Historical Data',
        breadcrumb: [
          { name: 'Admin', href: '/admin' },
          { name: 'Analytics', href: '/admin/analytics' },
          { name: 'Historical Data', href: '/admin/analytics/historical' }
        ]
      },
      '/admin/integrations': {
        name: 'Integrations',
        breadcrumb: [
          { name: 'Admin', href: '/admin' },
          { name: 'Integrations', href: '/admin/integrations' }
        ]
      },
      '/admin/notifications': {
        name: 'Notifications',
        breadcrumb: [
          { name: 'Admin', href: '/admin' },
          { name: 'Notifications', href: '/admin/notifications' }
        ]
      },
      '/admin/logs': {
        name: 'System Logs',
        breadcrumb: [
          { name: 'Admin', href: '/admin' },
          { name: 'System Logs', href: '/admin/logs' }
        ]
      },
      '/admin/sensor-models': {
        name: 'Sensor Models',
        breadcrumb: [
          { name: 'Admin', href: '/admin' },
          { name: 'Sensor Models', href: '/admin/sensor-models' }
        ]
      },
      '/admin/maintenance': {
        name: 'Maintenance',
        breadcrumb: [
          { name: 'Admin', href: '/admin' },
          { name: 'Maintenance', href: '/admin/maintenance' }
        ]
      }
    };
    
    return adminPages[pathname] || { name: 'Admin Dashboard', breadcrumb: [{ name: 'Admin Dashboard', href: '/admin' }] };
  }
  
  // Handle sensor details page
  if (parts[2] === 'sensors' && parts[3] && parts[3] !== 'new') {
    return {
      name: 'Sensor Information',
      breadcrumb: [
        { name: 'My Sensors', href: '/dashboard/sensors' },
        { name: 'Sensor Information', href: pathname }
      ]
    };
  }

  // Handle other static pages
  const staticPages: Record<string, { name: string; breadcrumb?: { name: string; href: string }[] }> = {
    '/dashboard': {
      name: 'Dashboard'
    },
    '/dashboard/sensors': {
      name: 'My Sensors',
      breadcrumb: [{ name: 'My Sensors', href: '/dashboard/sensors' }]
    },
    '/dashboard/sensors/new': {
      name: 'Add New Sensor',
      breadcrumb: [
        { name: 'My Sensors', href: '/dashboard/sensors' },
        { name: 'Add New Sensor', href: '/dashboard/sensors/new' }
      ]
    },
    '/dashboard/analytics': {
      name: 'Analytics',
      breadcrumb: [{ name: 'Analytics', href: '/dashboard/analytics' }]
    },
    '/dashboard/settings': {
      name: 'Settings',
      breadcrumb: [{ name: 'Settings', href: '/dashboard/settings' }]
    }
  };

  return staticPages[pathname] || { name: 'Dashboard' };
};

export function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const pageInfo = getPageInfo(pathname);

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 transition-all duration-200 sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            {/* Only show title on mobile */}
            <h1 className="lg:hidden text-xl font-semibold text-gray-900 dark:text-slate-100">
              {pageInfo.name}
            </h1>
            
            {/* Show breadcrumb on desktop */}
            <nav className="hidden lg:flex items-center text-gray-500 dark:text-slate-400">
              <Link 
                href="/dashboard"
                className="text-sm hover:text-gray-700 dark:hover:text-slate-300"
              >
                Dashboard
              </Link>
              {pageInfo.breadcrumb?.map((item, index) => (
                <div key={item.href} className="flex items-center">
                  <ChevronRightIcon className="h-4 w-4 mx-2" />
                  {index === (pageInfo.breadcrumb?.length ?? 0) - 1 ? (
                    <span className="text-sm text-gray-900 dark:text-slate-100">
                      {item.name}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-sm hover:text-gray-700 dark:hover:text-slate-300"
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
          
          {/* Header actions */}
          <div className="flex items-center">
            <div className="flex items-center space-x-1 sm:space-x-2 mr-2 sm:mr-4">
              <div className="hidden sm:block">
                <SearchButton />
              </div>
              <NotificationsButton />
              <ThemeToggle />
            </div>
            <div className="hidden sm:block h-6 border-l border-gray-200 dark:border-slate-700 mx-2 sm:mx-4" />
            <UserProfileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}