import ReplacementTracker from '@/components/replacement-tracker';
import { Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReplacementsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Replacement Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track replacement sensors being shipped to you after warranty claims
          </p>
        </div>
        
        <Link
          href="/dashboard/sensors"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sensors
        </Link>
      </div>
      
      {/* Main Content */}
      <ReplacementTracker />
    </div>
  );
}

export const metadata = {
  title: 'Replacement Tracking - CGM Sensor Tracker',
  description: 'Track replacement sensors being shipped after warranty claims',
};