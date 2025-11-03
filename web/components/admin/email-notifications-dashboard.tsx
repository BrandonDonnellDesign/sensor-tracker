'use client';

import { useState } from 'react';
import {
  Mail,
  Loader2
} from 'lucide-react';

interface NotificationStats {
  total_sent: number;
  success_rate: number;
  by_type: Record<string, { count: number; success_rate: number }>;
  daily_stats: Record<string, { sent: number; success: number }>;
}

export default function EmailNotificationsDashboard() {
  const [loading] = useState(false);
  const [stats] = useState<NotificationStats | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading notification statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Notifications</h1>
          <p className="text-gray-600">Monitor and manage email notification system</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Mail className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_sent || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📧 Email Setup Guide</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1. Database:</strong> Run email notification migration</p>
          <p><strong>2. Email Provider:</strong> Set up Resend or SendGrid API keys</p>
          <p><strong>3. Test:</strong> Use test suite to verify email delivery</p>
          <p><strong>4. Production:</strong> Configure weekly digest scheduling</p>
        </div>
      </div>
    </div>
  );
}