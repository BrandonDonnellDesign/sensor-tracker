'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

const primaryNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'My Sensors', href: '/dashboard/sensors', icon: 'sensors' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: 'analytics' },
];

const secondaryNavigation = [
  { name: 'Help & FAQ', href: '/dashboard/help', icon: 'help' },
];

const icons = {
  home: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  sensors: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  plus: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  analytics: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  settings: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  admin: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  user: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  help: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsAdmin((profile as any)?.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [user]);

  const adminNavigation = isAdmin ? [
    { name: 'Admin Dashboard', href: '/admin', icon: 'admin' },
  ] : [];

  const [sensorCount, setSensorCount] = useState(0);

  useEffect(() => {
    const fetchActiveSensorCount = async () => {
      if (!user?.id) return;
      
      try {
        const { data: sensors } = await supabase
          .from('sensors')
          .select(`
            *,
            sensor_models (
              duration_days
            )
          `)
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .is('archived_at', null);
        
        if (sensors) {
          // Calculate active sensors (not expired and not problematic)
          const activeSensors = sensors.filter((s: any) => {
            const sensorModel = s.sensor_models || { duration_days: 10 };
            const expirationDate = new Date(s.date_added);
            expirationDate.setDate(
              expirationDate.getDate() + sensorModel.duration_days
            );
            return expirationDate > new Date() && !s.is_problematic;
          });
          
          setSensorCount(activeSensors.length);
        }
      } catch (error) {
        console.error('Error fetching active sensor count:', error);
      }
    };

    fetchActiveSensorCount();
  }, [user]);


  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out lg:translate-x-0',
        isCollapsed ? 'w-20' : 'w-72',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo & User Info */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className={clsx(
                'transition-opacity duration-200',
                isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
              )}>
                <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">CGM Tracker</h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
              </div>
            </div>
            

          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            {/* Primary Navigation */}
            <div className="space-y-1 mb-8">
              {primaryNavigation.map((item) => {
                const isActive = pathname === item.href;
                const showBadge = item.name === 'My Sensors' && sensorCount > 0;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <div className={clsx(
                        'flex items-center justify-center w-5 h-5',
                        isActive ? 'text-white' : 'text-gray-500 dark:text-slate-400'
                      )}>
                        {icons[item.icon as keyof typeof icons]}
                      </div>
                      <span className={clsx(
                        'ml-3 transition-opacity duration-200',
                        isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
                      )}>{item.name}</span>
                    </div>
                    {showBadge && !isCollapsed && (
                      <span className={clsx(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      )}>
                        {sensorCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Admin Navigation */}
            {isAdmin && (
              <div className="space-y-1 mb-8">
                <div className={clsx(
                  'px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider',
                  isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
                )}>
                  Administration
                </div>
                <Link
                  href="/admin"
                  className={clsx(
                    'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    pathname.startsWith('/admin')
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className={clsx(
                    'flex items-center justify-center w-5 h-5',
                    pathname.startsWith('/admin') ? 'text-white' : 'text-gray-500 dark:text-slate-400'
                  )}>
                    {icons.admin}
                  </div>
                  <span className={clsx(
                    'ml-3 transition-opacity duration-200',
                    isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
                  )}>Admin Dashboard</span>
                </Link>
              </div>
            )}

            {/* Secondary Navigation */}
            <div className="space-y-1">
              <div className={clsx(
                'px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider',
                isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
              )}>
                Support
              </div>
              {secondaryNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className={clsx(
                      'flex items-center justify-center w-5 h-5',
                      isActive ? 'text-white' : 'text-gray-500 dark:text-slate-400'
                    )}>
                      {icons[item.icon as keyof typeof icons]}
                    </div>
                    <span className={clsx(
                      'ml-3 transition-opacity duration-200',
                      isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
                    )}>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">⌘K</kbd> to search
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg
                  className={clsx('w-4 h-4 transition-transform duration-200', isCollapsed ? 'rotate-180' : '')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}