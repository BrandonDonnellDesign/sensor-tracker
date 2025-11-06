import ReplacementTracker from '@/components/replacement-tracker';
import { Package } from 'lucide-react';

export default function ReplacementTrackingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="w-6 lg:w-8 h-6 lg:h-8 text-blue-600" />
            <span className="hidden sm:inline">Replacement Tracking</span>
            <span className="sm:hidden">Tracking</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm lg:text-base">
            Track your sensor replacement shipments and warranty claims
          </p>
        </div>
      </div>
      
      {/* Main Content */}
      <ReplacementTracker />
    </div>
  );
}

export const metadata = {
  title: 'Replacement Tracking - CGM Sensor Tracker',
  description: 'Track your sensor replacement shipments and warranty claims',
};