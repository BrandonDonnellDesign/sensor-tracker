'use client';

import { useState } from 'react';
import { 
  Bell, 
  Loader2
} from 'lucide-react';

interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  commentReplies: boolean;
  weeklyDigest: boolean;
  adminAlerts: boolean;
  email: string;
  name?: string;
}

export default function NotificationPreferences() {
  const [loading] = useState(false);
  const [preferences] = useState<NotificationPreferences | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading notification preferences...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center mb-2">
            <Bell className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
          </div>
          <p className="text-gray-600">
            Manage how and when you receive notifications from the CGM Tracker community.
          </p>
          {preferences && (
            <div className="mt-3 text-sm text-gray-500">
              <strong>Email:</strong> {preferences.email}
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-blue-800">
              <p className="font-medium mb-2">📧 Email Notification Setup</p>
              <p className="text-sm">
                Configure your email notification preferences to stay updated with community activity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}