'use client';

import { CommunityModerationDashboard } from '@/components/admin/community-moderation-dashboard';

export default function AdminCommunityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Community Moderation
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">
          Manage community tips, comments, and user interactions
        </p>
      </div>
      
      <CommunityModerationDashboard />
    </div>
  );
}