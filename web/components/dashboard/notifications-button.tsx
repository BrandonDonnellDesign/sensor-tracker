'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { useDateTimeFormatter } from '@/utils/date-formatter';

type Notification = {
  id: string;
  user_id: string;
  sensor_id?: string;
  title: string;
  message: string;
  type: 'sensor_expiring' | 'sensor_expired' | 'sensor_issue' | 'maintenance_reminder' | 'sensor_expiry_warning' | 'welcome' | 'system';
  read: boolean;
  created_at: string;
  updated_at: string;
};

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dateFormatter = useDateTimeFormatter();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [animateOpen, setAnimateOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | undefined>(undefined);

  // Close when clicking/tapping outside or pressing Escape
  useEffect(() => {
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    const onPointerDown = (e: Event) => {
      const target = e.target as Node;
      if (panelRef.current && buttonRef.current) {
        if (!panelRef.current.contains(target) && !buttonRef.current.contains(target)) {
          // Close via isOpen so the main effect handles animation/unmount timing
          setIsOpen(false);
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      setIsMounted(true);
      // Small timeout to allow CSS animation class to apply
      openTimer = setTimeout(() => setAnimateOpen(true), 10);
      document.addEventListener('pointerdown', onPointerDown as EventListener);
      document.addEventListener('touchstart', onPointerDown as EventListener);
      document.addEventListener('keydown', onKeyDown as EventListener);
    } else {
      // Start closing animation if panel is mounted
      if (isMounted) {
        setAnimateOpen(false);
        closeTimer = setTimeout(() => setIsMounted(false), 200);
      }
    }

    return () => {
      if (openTimer) clearTimeout(openTimer);
      if (closeTimer) clearTimeout(closeTimer);
      document.removeEventListener('pointerdown', onPointerDown as EventListener);
      document.removeEventListener('touchstart', onPointerDown as EventListener);
      document.removeEventListener('keydown', onKeyDown as EventListener);
    };
  }, [isOpen, isMounted]);

  // Position the panel: anchored to the button on desktop (lg and up), centered bottom on mobile
  useEffect(() => {
    if (!isMounted) return;

    const updatePos = () => {
      if (!buttonRef.current || !panelRef.current || typeof window === 'undefined') return;

      const isDesktop = window.innerWidth >= 1024; // lg breakpoint
      const btnRect = buttonRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();

      if (isDesktop) {
        // Anchor to the right of the button by default
        let left = btnRect.right + 8; // small gap
        let top = btnRect.top;

        // If panel would overflow right edge, clamp it
        const overflowX = left + panelRect.width - window.innerWidth - 12;
        if (overflowX > 0) left = Math.max(12, left - overflowX);

        // If panel overflows bottom, shift up
        if (top + panelRect.height > window.innerHeight - 12) {
          top = Math.max(12, window.innerHeight - panelRect.height - 12);
        }

        setPanelStyle({ position: 'absolute', left: left + window.scrollX, top: top + window.scrollY, transform: 'translateY(0)' });
      } else {
        // Centered fixed bottom for small screens
        setPanelStyle({ position: 'fixed', left: '50%', bottom: '1.5rem', transform: 'translateX(-50%)' });
      }
    };

    // run after a short delay so the panel's size is accurate
    const t = setTimeout(updatePos, 20);
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [isMounted, animateOpen]);

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get database notifications (only non-dismissed ones)
      const { data: userNotifications, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
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
      const supabase = createClient();
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
      const supabase = createClient();
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
      const supabase = createClient();
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

      // Remove the notification from the local state immediately for instant feedback
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
      alert('Error dismissing notification. Please try again.');
    }
  };

  const handleClearAll = async () => {
    try {
      const supabase = createClient();
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

      // Clear all notifications from local state immediately for instant feedback
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      alert('Error clearing notifications. Please try again.');
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center space-x-2 px-3 py-2 text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors w-full"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        <span>Notifications</span>
        {notifications.some(n => !n.read) && (
          <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </button>

  {isMounted && typeof document !== 'undefined' && createPortal(
        <>
          {/* Fullscreen overlay to capture outside clicks and prevent underlying UI from receiving the click */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Panel is fixed and centered at the bottom for a cleaner popup on small screens */}
          <div
            ref={panelRef}
            style={panelStyle}
            className={`z-[9999] w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 border border-gray-200 dark:border-slate-700 transform transition-all duration-200 ${animateOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Notifications</h2>
                  {notifications.some(n => !n.read) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {notifications.some(n => !n.read) && (
                    <button
                      className="text-xs px-2 py-1 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 transition-colors"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      className="text-xs px-2 py-1 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-colors"
                      onClick={handleClearAll}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <Bell className="h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
                      No notifications
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 text-center mt-1">
                      You&apos;re all caught up!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {notifications.map((notification) => {
                      const getNotificationIcon = () => {
                        if (notification.type === 'sensor_expired') {
                          return (
                            <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                          );
                        } else if (notification.type === 'sensor_expiring' || notification.type === 'sensor_expiry_warning') {
                          return (
                            <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          );
                        }
                      };

                      return (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 group relative transition-colors ${
                            !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          <div 
                            className="cursor-pointer"
                            onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                          >
                            <div className="flex gap-3">
                              {getNotificationIcon()}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                                        {notification.title}
                                      </h3>
                                      {!notification.read && (
                                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-300 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                                      {dateFormatter.formatTime(notification.created_at)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Dismiss notification"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>, document.body
      )}
    </div>
  );
}