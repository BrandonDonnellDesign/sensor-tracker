'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Activity, 
  BarChart3, 
  Settings, 
  Plus,
  Menu,
  X,
  User,
  Bell,
  UtensilsCrossed,
  Syringe
} from 'lucide-react';

interface MobileNavigationProps {
  className?: string;
}

export function MobileNavigation({ className = '' }: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      description: 'Overview and insights'
    },
    {
      name: 'Sensors',
      href: '/dashboard/sensors',
      icon: Activity,
      description: 'Manage your sensors'
    },
    {
      name: 'Food Log',
      href: '/dashboard/food',
      icon: UtensilsCrossed,
      description: 'Track your meals'
    },
    {
      name: 'Insulin',
      href: '/dashboard/insulin',
      icon: Syringe,
      description: 'Log bolus doses'
    },

    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      description: 'Performance data'
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      description: 'App preferences'
    }
  ];

  const quickActions = [
    {
      name: 'Add Sensor',
      href: '/dashboard/sensors/new',
      icon: Plus,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Log Food',
      href: '/dashboard/food',
      icon: UtensilsCrossed,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'Log Insulin',
      href: '/dashboard/insulin',
      icon: Syringe,
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className={`lg:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-slate-400" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              CGM Tracker
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard/notifications"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </Link>
            <Link
              href="/dashboard/profile"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <User className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-slate-800 shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Navigation
                </h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                </button>
              </div>
              
              {/* Quick Actions */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <Link
                      key={action.name}
                      href={action.href}
                      className={`${action.color} text-white p-3 rounded-xl flex flex-col items-center space-y-1 transition-colors`}
                    >
                      <action.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{action.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              
              {/* Navigation Items */}
              <div className="flex-1 p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">
                  Pages
                </h3>
                <nav className="space-y-2">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-3 p-3 rounded-xl transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    </Link>
                  ))}
                </nav>
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                <div className="text-xs text-gray-500 dark:text-slate-400 text-center">
                  CGM Tracker v1.0
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation (Alternative mobile nav) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 z-40">
        <div className="grid grid-cols-5 h-16">
          {/* Show most important navigation items */}
          {navigationItems.slice(0, 5).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                isActive(item.href)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

// Floating Action Button for quick sensor addition
export function FloatingActionButton() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide FAB when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <Link
      href="/dashboard/sensors/new"
      className={`lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-30 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
      }`}
    >
      <Plus className="w-6 h-6" />
    </Link>
  );
}