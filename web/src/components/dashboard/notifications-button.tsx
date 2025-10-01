'use client';

import { useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';

type Notification = {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
};

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  // TODO: Replace with actual notifications from backend
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Sensor Reading Alert',
      message: 'Your sensor "Living Room" is reporting high glucose levels',
      date: new Date(),
      read: false,
    }
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
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg ${
                        notification.read
                          ? 'bg-gray-50 dark:bg-slate-700/50'
                          : 'bg-blue-50 dark:bg-blue-900/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className={`text-sm font-medium ${
                          notification.read
                            ? 'text-gray-900 dark:text-slate-100'
                            : 'text-blue-900 dark:text-blue-100'
                        }`}>
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
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}