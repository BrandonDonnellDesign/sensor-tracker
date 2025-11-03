import { Metadata } from 'next';
import { CommunityDashboard } from '@/components/community/community-dashboard';

export const metadata: Metadata = {
  title: 'Community Hub - CGM Companion',
  description: 'Connect with fellow CGM users, share tips, and learn from the community',
};

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CommunityDashboard />
      </div>
    </div>
  );
}