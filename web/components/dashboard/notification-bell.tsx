'use client';

import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationContext } from '@/components/notifications/realtime-notification-provider';

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