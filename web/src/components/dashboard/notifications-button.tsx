'use client';

import { useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';

// Mock notification data - replace with real data from backend
type Notification = {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  type: 'sensor_expiring' | 'sensor_expired' | 'sensor_issue';
};

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  // TODO: Replace with actual notifications from backend
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Sensor expires soon',
      message: 'Your Dexcom sensor (SN: DX123456) will expire in 2 days. Please plan to replace it.',
      date: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      read: false,
      type: 'sensor_expiring',
    },
    {
      id: '2',
      title: 'Sensor has expired',
      message: 'Your Freestyle Libre sensor (SN: FL789012) has expired. Please replace it immediately.',
      date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: true,
      type: 'sensor_expired',
    },
  ]);

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
                    onClick={() => {/* TODO: Mark all as read */}}
                  >
                    Mark all as read
                  </button>
                )}
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
                        className={`p-3 rounded-lg ${getNotificationStyle()}`}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className={`text-sm font-medium ${getTitleColor()}`}>
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {new Date(notification.date).toLocaleTimeString()}
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