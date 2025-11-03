'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { 
  Menu, 
  X, 
  Bell, 
  Search,
  User,
  Settings,
  LogOut,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponsiveHeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  className?: string;
}

export function ResponsiveHeader({
  title = 'CGM Tracker',
  subtitle,
  showSearch = true,
  showNotifications = true,
  className
}: ResponsiveHeaderProps) {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <header className={cn(
        'bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3',
        className
      )}>
        <div className="flex items-center justify-between">
          {/* Left Side - Logo/Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2">
            {showSearch && (
              <TouchFriendlyButton
                variant="ghost"
                size="sm"
                icon={<Search />}
                className="hidden sm:flex"
                data-search-trigger
              >
                Search
              </TouchFriendlyButton>
            )}

            {showNotifications && (
              <TouchFriendlyButton
                variant="ghost"
                size="sm"
                icon={<Bell />}
              >
                Notifications
              </TouchFriendlyButton>
            )}

            {/* User Menu - Desktop */}
            <div className="hidden lg:flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                {user?.email}
              </span>
              <TouchFriendlyButton
                variant="ghost"
                size="sm"
                icon={<User />}
                onClick={() => setIsMenuOpen(true)}
              >
                Menu
              </TouchFriendlyButton>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-800 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  CGM Tracker
                </span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              <TouchFriendlyButton
                variant="ghost"
                size="lg"
                fullWidth
                icon={<Settings />}
                onClick={() => {
                  setIsMenuOpen(false);
                  window.location.href = '/dashboard/settings';
                }}
                className="justify-start"
              >
                Settings
              </TouchFriendlyButton>

              <TouchFriendlyButton
                variant="ghost"
                size="lg"
                fullWidth
                icon={<Activity />}
                onClick={() => {
                  setIsMenuOpen(false);
                  window.location.href = '/docs';
                }}
                className="justify-start"
              >
                API Documentation
              </TouchFriendlyButton>

              <TouchFriendlyButton
                variant="ghost"
                size="lg"
                fullWidth
                icon={<Settings />}
                onClick={() => {
                  setIsMenuOpen(false);
                  window.location.href = '/dashboard/settings?tab=api';
                }}
                className="justify-start"
              >
                API Keys
              </TouchFriendlyButton>

              {showSearch && (
                <TouchFriendlyButton
                  variant="ghost"
                  size="lg"
                  fullWidth
                  icon={<Search />}
                  onClick={() => setIsMenuOpen(false)}
                  className="justify-start sm:hidden"
                  data-search-trigger
                >
                  Search
                </TouchFriendlyButton>
              )}

              <TouchFriendlyButton
                variant="ghost"
                size="lg"
                fullWidth
                icon={<LogOut />}
                onClick={handleSignOut}
                className="justify-start text-red-600 dark:text-red-400"
              >
                Sign Out
              </TouchFriendlyButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}