'use client';

import { usePathname } from 'next/navigation';
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';



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
  const pageInfo = getPageInfo(pathname);



  return (
    <header className="bg-gradient-to-b from-white/95 to-white/90 dark:from-slate-900/95 dark:to-slate-900/90 backdrop-blur-md shadow-sm shadow-gray-200/30 dark:shadow-slate-800/30 transition-all duration-200 sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="flex h-16 items-center justify-between relative">
          {/* Subtle fade effect at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200/50 dark:via-slate-700/50 to-transparent"></div>
          <div className="flex items-center">
            {/* Only show title on mobile */}
            <h1 className="lg:hidden text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">
              {pageInfo.name}
            </h1>
            
            {/* Show breadcrumb on desktop */}
            <nav className="hidden lg:flex items-center">
              <Link 
                href="/dashboard"
                className="flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 5v4" />
                </svg>
                Dashboard
              </Link>
              {pageInfo.breadcrumb?.map((item, index) => (
                <div key={item.href} className="flex items-center">
                  <ChevronRightIcon className="h-3 w-3 mx-2 text-gray-400 dark:text-slate-500" />
                  {index === (pageInfo.breadcrumb?.length ?? 0) - 1 ? (
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {item.name}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors font-medium"
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
          

        </div>
      </div>
    </header>
  );
}