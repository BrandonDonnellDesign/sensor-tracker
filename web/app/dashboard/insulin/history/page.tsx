import { InsulinHistory } from '@/components/insulin/insulin-history';
import { DosingAnalytics } from '@/components/insulin/dosing-analytics';
import { History, Syringe } from 'lucide-react';
import Link from 'next/link';

export default function InsulinHistoryPage() {

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <History className="w-8 h-8 text-orange-600" />
            Insulin History & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your insulin usage patterns, effectiveness, and trends
          </p>
        </div>
        
        <Link
          href="/dashboard/insulin"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          <Syringe className="w-4 h-4" />
          Log New Bolus
        </Link>
      </div>
      
      {/* Analytics Section */}
      <DosingAnalytics />
      
      {/* History Section */}
      <InsulinHistory />
    </div>
  );
}

export const metadata = {
  title: 'Insulin History - CGM Sensor Tracker',
  description: 'View your insulin usage history, patterns, and analytics',
};