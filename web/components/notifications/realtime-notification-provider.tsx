'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useRealtimeNotifications, useNotificationPermission, RealtimeNotification } from '@/lib/realtime-notifications';
import { Bell, BellOff, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationContextType {
  notifications: RealtimeNotification[];
  isConnected: boolean;
  dismissNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function RealtimeNotificationProvider({ children }: { children: ReactNode }) {
  const realtimeNotifications = useRealtimeNotifications();
  const notificationPermission = useNotificationPermission();

  return (
    <NotificationContext.Provider 
      value={{
        ...realtimeNotifications,
        ...notificationPermission
      }}
    >
      {children}
      <NotificationPermissionBanner />
      <ConnectionStatus isConnected={realtimeNotifications.isConnected} />
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within RealtimeNotificationProvider');
  }
  return context;
}

// Component to show notification permission banner
function NotificationPermissionBanner() {
  const { permission, requestPermission, isSupported } = useNotificationPermission();

  if (!isSupported || permission === 'granted' || permission === 'denied') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-sm">Enable Notifications</h4>
          <p className="text-xs opacity-90 mt-1">
            Get instant alerts for insulin safety and glucose warnings
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={requestPermission}
              className="text-xs"
            >
              Enable
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {/* Hide banner */}}
              className="text-xs text-white hover:text-white hover:bg-white/20"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to show connection status
function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  if (isConnected) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-red-600 text-white p-3 rounded-lg shadow-lg flex items-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm">Notifications offline</span>
    </div>
  );
}

// Notification bell icon with count
export function NotificationBell() {
  const { notifications, isConnected } = useNotificationContext();
  
  const unreadCount = notifications.filter(n => !n.metadata?.read).length;

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="relative">
        {isConnected ? (
          <Bell className="w-5 h-5" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-400" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      
      {!isConnected && (
        <div className="absolute -bottom-1 -right-1">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}