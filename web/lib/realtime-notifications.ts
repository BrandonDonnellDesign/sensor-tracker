'use client';

import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner'; // Assuming you're using sonner for toasts

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  created_at: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const showNotificationToast = useCallback((notification: RealtimeNotification) => {
    const priority = notification.metadata?.priority || notification.type;
    
    switch (priority) {
      case 'urgent':
        toast.error(notification.title, {
          description: notification.message,
          duration: 10000, // 10 seconds
          action: notification.metadata?.action_url ? {
            label: 'View Details',
            onClick: () => window.location.href = notification.metadata!.action_url
          } : undefined
        });
        
        // Also show browser notification for urgent alerts
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id,
            requireInteraction: true
          });
        }
        break;
        
      case 'high':
        toast.warning(notification.title, {
          description: notification.message,
          duration: 8000,
          action: notification.metadata?.action_url ? {
            label: 'View Details',
            onClick: () => window.location.href = notification.metadata!.action_url
          } : undefined
        });
        break;
        
      case 'medium':
        toast.info(notification.title, {
          description: notification.message,
          duration: 5000
        });
        break;
        
      default:
        toast(notification.title, {
          description: notification.message,
          duration: 4000
        });
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as RealtimeNotification;
          
          // Add to notifications list
          setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
          
          // Show toast notification
          showNotificationToast(notification);
          
          console.log('📱 Real-time notification received:', notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as RealtimeNotification;
          
          // Update notification in list
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('🔌 Notification subscription status:', status);
      });

    // Load initial notifications
    const loadInitialNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        const mappedNotifications: RealtimeNotification[] = data.map(notification => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: (notification as any).metadata?.priority || 'medium',
          metadata: (notification as any).metadata,
          created_at: notification.created_at || new Date().toISOString()
        }));
        setNotifications(mappedNotifications);
      }
    };

    loadInitialNotifications();

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user, showNotificationToast]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        dismissed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    const supabase = createClient();
    
    await supabase
      .from('notifications')
      .update({ 
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);
  }, [user]);

  return {
    notifications,
    isConnected,
    dismissNotification,
    markAsRead
  };
}

// Hook for notification permission management
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return 'denied';
  }, []);

  return {
    permission,
    requestPermission,
    isSupported: 'Notification' in window
  };
}