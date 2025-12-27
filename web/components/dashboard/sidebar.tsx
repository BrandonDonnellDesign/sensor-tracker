'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useGamification } from '@/components/providers/gamification-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase-client';
import {
  Home,
  Activity,
  BarChart3,
  Settings,
  HelpCircle,
  Shield,
  Zap,
  Target,
  Award,
  Map,
  Users,
  Bell,
  FileText,
  Link2,
  Database,
  Wrench,
  UtensilsCrossed,
  MessageSquare,
  TrendingUp,
  Syringe,
  Package,
} from 'lucide-react';
import { NotificationsButton } from '@/components/dashboard/notifications-button';

const primaryNavigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview & insights',
  },
  {
    name: 'Glucose Data',
    href: '/dashboard/glucose-data',
    icon: TrendingUp,
    description: 'CGM readings & predictions',
    badge: 'ENHANCED',
  },
  {
    name: 'My Sensors',
    href: '/dashboard/sensors',
    icon: Activity,
    description: 'Manage your sensors',
  },
  {
    name: 'Inventory',
    href: '/dashboard/inventory',
    icon: Package,
    description: 'Supplies & stock',
  },
  {
    name: 'Food & Insulin',
    href: '/dashboard/food',
    icon: UtensilsCrossed,
    description: 'Meals + insulin tracking',
    badge: 'SMART',
  },
  {
    name: 'Insulin Management',
    href: '/dashboard/insulin',
    icon: Syringe,
    description: 'IOB tracking & doses',
    badge: 'NEW',
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    description: 'Performance data',
  },
  {
    name: 'Community',
    href: '/dashboard/community',
    icon: Users,
    description: 'Connect & compare',
  },
];

const secondaryNavigation = [
  {
    name: 'Roadmap',
    href: '/roadmap',
    icon: Map,
    description: 'Upcoming features',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Preferences & config',
  },
  {
    name: 'Help & FAQ',
    href: '/dashboard/help',
    icon: HelpCircle,
    description: 'Support & guides',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { userStats, streakStatus } = useGamification();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sensorCount, setSensorCount] = useState(0);
  const [problematicCount, setProblematicCount] = useState(0);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;

      try {
        const supabase = createClient();
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

  const adminNavigation = isAdmin
    ? [
        {
          name: 'Admin Home',
          href: '/admin',
          icon: Shield,
          description: 'Admin dashboard',
        },
        {
          name: 'Users',
          href: '/admin/users',
          icon: Users,
          description: 'User management',
        },
        {
          name: 'Community',
          href: '/admin/community',
          icon: MessageSquare,
          description: 'Community moderation',
        },
        {
          name: 'Performance',
          href: '/admin/performance',
          icon: BarChart3,
          description: 'System monitoring',
        },
        {
          name: 'Security',
          href: '/admin/security',
          icon: Shield,
          description: 'Security monitoring',
        },
        {
          name: 'Notifications',
          href: '/admin/notifications',
          icon: Bell,
          description: 'Manage notifications',
        },
        {
          name: 'Logs',
          href: '/admin/logs',
          icon: FileText,
          description: 'System logs',
        },
        {
          name: 'Gamification',
          href: '/admin/gamification',
          icon: Award,
          description: 'Achievements & stats',
        },
        {
          name: 'Roadmap',
          href: '/admin/roadmap',
          icon: Map,
          description: 'Manage roadmap',
        },
        {
          name: 'Integrations',
          href: '/admin/integrations',
          icon: Link2,
          description: 'External integrations',
        },
        {
          name: 'Sensor Models',
          href: '/admin/sensor-models',
          icon: Database,
          description: 'Manage models',
        },
        {
          name: 'Maintenance',
          href: '/admin/maintenance',
          icon: Wrench,
          description: 'System maintenance',
        },
        {
          name: 'Settings',
          href: '/admin/settings',
          icon: Settings,
          description: 'System settings',
        },
      ]
    : [];

  useEffect(() => {
    const fetchSensorData = async () => {
      if (!user?.id) return;

      try {
        const supabase = createClient();
        const { data: sensors } = await supabase
          .from('sensors')
          .select(
            `
            *,
            sensor_models (
              duration_days
            )
          `
          )
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

          const problematic = sensors.filter((s: any) => s.is_problematic);

          setSensorCount(activeSensors.length);
          setProblematicCount(problematic.length);
        }
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    };

    fetchSensorData();
  }, [user]);

  // Fetch profile avatar
  useEffect(() => {
    const fetchProfileAvatar = async () => {
      if (!user?.id) return;

      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (profile?.avatar_url) {
          setProfileAvatar(profile.avatar_url);
        }
      } catch (error) {
        console.error('Error fetching profile avatar:', error);
      }
    };

    fetchProfileAvatar();
  }, [user]);

  return (
    <>
      {/* Mobile menu button */}
      <div className='lg:hidden fixed top-4 left-4 z-50'>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className='bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200'>
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 6h16M4 12h16M4 18h16'
            />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 transform transition-all duration-300 ease-in-out lg:translate-x-0',
          isCollapsed ? 'w-16 lg:w-20' : 'w-72',
          isMobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        )}>
        <div className='flex flex-col h-full'>
          {/* Logo & Collapse Icon */}

          <div className='px-6 py-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md'>
                <Activity className='w-6 h-6 text-white' />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className='text-lg font-bold text-gray-900 dark:text-slate-100'>
                    CGM Tracker
                  </h1>
                  <p className='text-xs text-gray-500 dark:text-slate-400'>
                    Smart sensor management
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className='ml-2 p-2 rounded-xl text-[#60cfff] hover:text-blue-400 bg-transparent transition-all duration-200'
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {/* Double-chevron icon */}
              {isCollapsed ? (
                <svg
                  className='w-6 h-6'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  viewBox='0 0 24 24'>
                  <polyline points='9 18 15 12 9 6' />
                  <polyline points='5 18 11 12 5 6' />
                </svg>
              ) : (
                <svg
                  className='w-6 h-6'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  viewBox='0 0 24 24'>
                  <polyline points='15 6 9 12 15 18' />
                  <polyline points='19 6 13 12 19 18' />
                </svg>
              )}
            </button>
          </div>

          {/* Enhanced User Profile Section */}
          {!isCollapsed && user && (
            <div className='px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200 dark:border-slate-700'>
              <div className='flex items-center space-x-3 mb-3'>
                <div className='relative w-10 h-10 rounded-full shadow-md overflow-hidden'>
                  {profileAvatar ? (
                    <Image
                      src={profileAvatar}
                      alt={user.user_metadata?.full_name || 'Profile'}
                      width={40}
                      height={40}
                      className='w-full h-full object-cover'
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback =
                          target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm ${
                      profileAvatar ? 'hidden' : 'flex'
                    }`}>
                    {(() => {
                      const name =
                        user.user_metadata?.full_name ||
                        user.email?.split('@')[0] ||
                        'U';
                      const initials = name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
                      return initials;
                    })()}
                  </div>
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold text-gray-900 dark:text-slate-100 truncate'>
                    {user.user_metadata?.full_name ||
                      user.email?.split('@')[0] ||
                      'User'}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-slate-400 truncate'>
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className='p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors'
                  title='Sign out'>
                  <svg
                    className='w-4 h-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                    />
                  </svg>
                </button>
              </div>

              {/* Gamification Stats */}
              {userStats && (
                <div className='flex items-center justify-between text-sm'>
                  <div className='flex items-center space-x-3'>
                    <div className='flex items-center space-x-1'>
                      <Zap className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                      <span className='font-medium text-gray-900 dark:text-slate-100'>
                        Level {userStats.level}
                      </span>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <Target className='w-4 h-4 text-green-600 dark:text-green-400' />
                      <span className='text-gray-600 dark:text-slate-400'>
                        {streakStatus?.streakData.currentStreak || userStats.current_streak || 0} streak
                      </span>
                    </div>
                  </div>
                  <div className='flex items-center space-x-1'>
                    <Award className='w-4 h-4 text-yellow-600 dark:text-yellow-400' />
                    <span className='text-xs text-gray-500 dark:text-slate-500 font-medium'>
                      {userStats.total_points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation with section headers and grouping */}
          <nav className='flex-1 px-4 py-6 overflow-y-auto'>
            {/* CORE TRACKING */}
            {!isCollapsed && (
              <div className='px-4 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2'>
                CORE TRACKING
              </div>
            )}
            <div className='space-y-2 mb-8'>
              {primaryNavigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                // ...existing code for badges and rendering...
                const getBadge = () => {
                  if (item.name === 'My Sensors' && sensorCount > 0) {
                    return { count: sensorCount, color: 'blue', text: null };
                  }
                  if (item.name === 'My Sensors' && problematicCount > 0) {
                    return { count: problematicCount, color: 'red', text: null };
                  }
                  if (item.badge) {
                    return { count: null, color: 'green', text: item.badge };
                  }
                  return null;
                };
                const badge = getBadge();
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative',
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-300 dark:text-slate-300 hover:bg-[#2d2e4a] hover:text-white dark:hover:text-white'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}>
                    <div className='flex items-center min-w-0 flex-1'>
                      <Icon
                        className={clsx(
                          'w-5 h-5 flex-shrink-0',
                          isActive
                            ? 'text-white'
                            : 'text-blue-400 dark:text-blue-400'
                        )}
                      />
                      {!isCollapsed && (
                        <div className='ml-3 min-w-0 flex-1'>
                          <div className='font-medium truncate'>
                            {item.name}
                          </div>
                          <div
                            className={clsx(
                              'text-xs truncate',
                              isActive
                                ? 'text-white/80'
                                : 'text-gray-400 dark:text-slate-500'
                            )}>
                            {item.description}
                          </div>
                        </div>
                      )}
                    </div>
                    {badge && !isCollapsed && (
                      <span
                        className={clsx(
                          'px-2 py-1 text-xs font-bold rounded-full flex-shrink-0',
                          badge.color === 'red'
                            ? isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : badge.color === 'green'
                            ? isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        )}>
                        {badge.text || badge.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* SETTINGS */}
            {!isCollapsed && (
              <div className='px-4 py-2 text-xs font-semibold text-pink-300 uppercase tracking-wider mb-2'>
                SETTINGS
              </div>
            )}
            <div className='space-y-2 mb-8'>
              {secondaryNavigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25'
                        : 'text-gray-300 dark:text-slate-300 hover:bg-[#2d2e4a] hover:text-white dark:hover:text-white'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}>
                    <div className='flex items-center min-w-0 flex-1'>
                      <Icon
                        className={clsx(
                          'w-5 h-5 flex-shrink-0',
                          isActive
                            ? 'text-white'
                            : 'text-pink-300 dark:text-pink-300'
                        )}
                      />
                      {!isCollapsed && (
                        <div className='ml-3 min-w-0 flex-1'>
                          <div className='font-medium truncate'>
                            {item.name}
                          </div>
                          <div
                            className={clsx(
                              'text-xs truncate',
                              isActive
                                ? 'text-white/80'
                                : 'text-gray-400 dark:text-slate-500'
                            )}>
                            {item.description}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* ADMIN */}
            {isAdmin && adminNavigation.length > 0 && (
              <>
                {!isCollapsed && (
                  <div className='px-4 py-2 text-xs font-semibold text-yellow-300 uppercase tracking-wider mb-2'>
                    ADMIN
                  </div>
                )}
                <div className='space-y-2 mb-8'>
                  {adminNavigation.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/admin' &&
                        pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={clsx(
                          'group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/25'
                            : 'text-gray-300 dark:text-slate-300 hover:bg-[#2d2e4a] hover:text-white dark:hover:text-white'
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}>
                        <div className='flex items-center min-w-0 flex-1'>
                          <Icon
                            className={clsx(
                              'w-5 h-5 flex-shrink-0',
                              isActive
                                ? 'text-white'
                                : 'text-yellow-300 dark:text-yellow-300'
                            )}
                          />
                          {!isCollapsed && (
                            <div className='ml-3 min-w-0 flex-1'>
                              <div className='font-medium truncate'>
                                {item.name}
                              </div>
                              <div
                                className={clsx(
                                  'text-xs truncate',
                                  isActive
                                    ? 'text-white/80'
                                    : 'text-gray-400 dark:text-slate-500'
                                )}>
                                {item.description}
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </nav>

          {/* Bottom section - Premium Enhanced Action Bar */}
          <div className='relative p-4 border-t border-gray-200/80 dark:border-slate-700/80 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-slate-800/30 dark:to-transparent'>
            {/* Subtle top glow effect */}
            <div className='absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-200/50 dark:via-blue-400/20 to-transparent'></div>

            {/* Action Bar - Notifications, Theme (when expanded) */}
            {!isCollapsed && (
              <div className='mb-4'>
                {/* Utility Controls Row - Enhanced */}
                <div className='flex items-center space-x-3'>
                  {/* Notifications with enhanced container */}
                  <div className='flex-1 relative'>
                    <div className='bg-white/40 dark:bg-slate-800/40 rounded-xl p-1 border border-gray-200/40 dark:border-slate-600/40 backdrop-blur-sm'>
                      <NotificationsButton />
                    </div>
                  </div>

                  {/* Theme toggle with premium container */}
                  <div className='bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-slate-800/60 dark:to-slate-700/60 rounded-xl p-1.5 border border-gray-200/60 dark:border-slate-600/60 shadow-sm backdrop-blur-sm'>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom ambient glow */}
            <div className='absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-blue-300/30 dark:via-blue-400/20 to-transparent'></div>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className='fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-all duration-300'
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
