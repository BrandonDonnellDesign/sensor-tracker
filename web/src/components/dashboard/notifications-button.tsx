'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { useDateTimeFormatter } from '@/utils/date-formatter';

type Notification = {
  id: string;
  user_id: string;
  sensor_id?: string;
  title: string;
  message: string;
  type: 'sensor_expiring' | 'sensor_expired' | 'sensor_issue' | 'maintenance_reminder';
  read: boolean;
  created_at: string;
  updated_at: string;
};

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dateFormatter = useDateTimeFormatter();

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userNotifications, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        // If table doesn't exist yet, show empty notifications
        setNotifications([]);
        return;
      }

      setNotifications(userNotifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the notification click
    
    try {
      // Get the current session to ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to dismiss notifications');
        return;
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'delete',
          notificationId: notificationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to dismiss notification');
      }

      // Remove the notification from the local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
      alert('Error dismissing notification. Please try again.');
    }
  };

  const handleClearAll = async () => {
    try {
      // Get the current session to ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to clear notifications');
        return;
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'clear-all',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear notifications');
      }

      // Clear all notifications from local state
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      alert('Error clearing notifications. Please try again.');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-full w-10 h-10 text-gray-500 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-0 focus:ring-3 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        <BellIcon className="h-5 w-5" />
        {notifications.some(n => !n.read) && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-3 ring-black/5 dark:ring-white/10 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Notifications</h2>
                <div className="flex items-center gap-3">
                  {notifications.some(n => !n.read) && (
                    <button
                      className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      className="text-sm text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                      onClick={handleClearAll}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                    No notifications
                  </p>
                ) : (
                  notifications.map((notification) => {
                    const getNotificationStyle = () => {
                      if (notification.type === 'sensor_expired') {
                        return notification.read
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-red-50 dark:bg-red-900/30';
                      } else if (notification.type === 'sensor_expiring') {
                        return notification.read
                          ? 'bg-yellow-50 dark:bg-yellow-900/20'
                          : 'bg-yellow-50 dark:bg-yellow-900/30';
                      } else {
                        return notification.read
                          ? 'bg-gray-50 dark:bg-slate-700/50'
                          : 'bg-blue-50 dark:bg-blue-900/20';
                      }
                    };

                    const getTitleColor = () => {
                      if (notification.type === 'sensor_expired') {
                        return notification.read
                          ? 'text-red-900 dark:text-red-100'
                          : 'text-red-900 dark:text-red-100';
                      } else if (notification.type === 'sensor_expiring') {
                        return notification.read
                          ? 'text-yellow-900 dark:text-yellow-100'
                          : 'text-yellow-900 dark:text-yellow-100';
                      } else {
                        return notification.read
                          ? 'text-gray-900 dark:text-slate-100'
                          : 'text-blue-900 dark:text-blue-100';
                      }
                    };

                    return (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg group relative ${getNotificationStyle()}`}
                      >
                        <div 
                          className="cursor-pointer"
                          onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                        >
                          <div className="flex justify-between items-start">
                            <h3 className={`text-sm font-medium pr-8 ${getTitleColor()}`}>
                              {notification.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-slate-400">
                                {dateFormatter.formatTime(notification.created_at)}
                              </span>
                              <button
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete notification"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}