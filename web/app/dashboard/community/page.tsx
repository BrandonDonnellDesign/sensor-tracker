import { Metadata } from 'next';
import { CommunityDashboard } from '@/components/community/community-dashboard';

export const metadata: Metadata = {
  title: 'Community Hub - CGM Companion',
  description: 'Connect with fellow CGM users, share tips, and learn from the community',
};

export default function CommunityPage() {
  return <CommunityDashboard />;
}