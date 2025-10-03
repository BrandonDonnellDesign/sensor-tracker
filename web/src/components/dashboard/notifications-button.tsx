'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { getSensorExpirationInfo } from '@dexcom-tracker/shared/utils/sensorExpiration';

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
  const [loading, setLoading] = useState(false);

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

  const handleGenerateNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Generating notifications for user:', user.id);

      // Get all active sensors for the user with sensor model information
      const { data: sensors, error: sensorsError } = await (supabase as any)
        .from('sensors')
        .select(`
          *,
          sensorModel:sensor_models(*)
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (sensorsError) {
        console.error('Error fetching sensors for notifications:', sensorsError);
        return;
      }

      console.log('Found sensors:', sensors?.length || 0);

      if (!sensors || sensors.length === 0) {
        console.log('No sensors found for user');
        return;
      }

      // Check each sensor for expiration notifications
      for (const sensor of sensors) {
        console.log('Checking sensor:', sensor.serial_number, 'added:', sensor.date_added);
        const dateObj = new Date(sensor.date_added);
        console.log('Date object created:', dateObj, 'is valid:', !isNaN(dateObj.getTime()));
        
        // Use the actual sensor model if available, otherwise fall back to sensor_type logic
        let sensorModel: any;
        if ((sensor as any).sensorModel) {
          sensorModel = (sensor as any).sensorModel;
          console.log('Using sensor model:', sensorModel.manufacturer, sensorModel.model_name, 'duration:', sensorModel.duration_days, 'days');
        } else {
          console.log('No sensor model found, using fallback based on sensor_type');
          sensorModel = {
            id: 'fallback',
            manufacturer: (sensor as any).sensor_type === 'dexcom' ? 'Dexcom' : 'Abbott',
            modelName: (sensor as any).sensor_type === 'dexcom' ? 'G6' : 'FreeStyle Libre',
            durationDays: (sensor as any).sensor_type === 'dexcom' ? 10 : 14, // Updated to match database values
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        
        const expirationInfo = getSensorExpirationInfo(sensor.date_added, sensorModel);
        console.log('Expiration info:', expirationInfo);

        // Check if sensor is expired
        if (expirationInfo.isExpired) {
          console.log('Sensor is expired, checking for existing notification...');
          // Check if we already have an expired notification for this sensor
          const { data: existingNotification, error: checkError } = await (supabase as any)
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('sensor_id', sensor.id)
            .eq('type', 'sensor_expired')
            .limit(1);

          if (checkError) {
            console.error('Error checking for existing notification:', checkError);
            continue;
          }

          if (!existingNotification || existingNotification.length === 0) {
            console.log('Creating expired notification for sensor:', sensor.serial_number);
            const { error: insertError } = await (supabase as any)
              .from('notifications')
              .insert({
                user_id: user.id,
                sensor_id: sensor.id,
                title: 'Sensor has expired',
                message: `Your sensor (SN: ${sensor.serial_number}) has expired. Please replace it immediately.`,
                type: 'sensor_expired',
              });

            if (insertError) {
              console.error('Error creating notification:', insertError);
            } else {
              console.log('Created expired notification successfully');
            }
          } else {
            console.log('Expired notification already exists for sensor');
          }
        }
        // Check if sensor expires within 2 days
        else if (expirationInfo.isExpiringSoon) {
          console.log('Sensor expires soon, checking for existing notification...');
          // Check if we already have an expiring notification for this sensor
          const { data: existingNotification, error: checkError } = await (supabase as any)
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('sensor_id', sensor.id)
            .eq('type', 'sensor_expiring')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
            .limit(1);

          if (checkError) {
            console.error('Error checking for existing expiring notification:', checkError);
            continue;
          }

          if (!existingNotification || existingNotification.length === 0) {
            console.log('Creating expiring notification for sensor:', sensor.serial_number);
            const { error: insertError } = await (supabase as any)
              .from('notifications')
              .insert({
                user_id: user.id,
                sensor_id: sensor.id,
                title: 'Sensor expires soon',
                message: `Your sensor (SN: ${sensor.serial_number}) will expire in ${expirationInfo.daysLeft} day${expirationInfo.daysLeft !== 1 ? 's' : ''}. Please plan to replace it.`,
                type: 'sensor_expiring',
              });

            if (insertError) {
              console.error('Error creating expiring notification:', insertError);
            } else {
              console.log('Created expiring notification successfully');
            }
          } else {
            console.log('Expiring notification already exists for sensor');
          }
        }

        // Check for problematic sensors
        if (sensor.is_problematic && sensor.issue_notes) {
          console.log('Sensor has issues, checking for existing notification...');
          // Check if we already have an issue notification for this sensor
          const { data: existingNotification, error: checkError } = await (supabase as any)
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('sensor_id', sensor.id)
            .eq('type', 'sensor_issue')
            .limit(1);

          if (checkError) {
            console.error('Error checking for existing issue notification:', checkError);
            continue;
          }

          if (!existingNotification || existingNotification.length === 0) {
            console.log('Creating issue notification for sensor:', sensor.serial_number);
            const { error: insertError } = await (supabase as any)
              .from('notifications')
              .insert({
                user_id: user.id,
                sensor_id: sensor.id,
                title: 'Sensor issue detected',
                message: `Issue with sensor (SN: ${sensor.serial_number}): ${sensor.issue_notes}`,
                type: 'sensor_issue',
              });

            if (insertError) {
              console.error('Error creating issue notification:', insertError);
            } else {
              console.log('Created issue notification successfully');
            }
          } else {
            console.log('Issue notification already exists for sensor');
          }
        }
      }

      console.log('Finished generating notifications, reloading...');
      await loadNotifications(); // Reload notifications after generating
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-full w-10 h-10 text-gray-500 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        aria-label="Notifications"
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
          <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Notifications</h2>
                {notifications.some(n => !n.read) && (
                  <button
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={handleMarkAllAsRead}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Debug button to generate notifications */}
              <div className="mb-4">
                <button
                  onClick={handleGenerateNotifications}
                  disabled={loading}
                  className="text-xs text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Notifications'}
                </button>
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
                        className={`p-3 rounded-lg cursor-pointer ${getNotificationStyle()}`}
                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className={`text-sm font-medium ${getTitleColor()}`}>
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {new Date(notification.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                          {notification.message}
                        </p>
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