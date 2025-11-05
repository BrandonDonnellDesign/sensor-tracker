import { BolusLogger } from '@/components/insulin/bolus-logger';
import { SmartCalculator } from '@/components/insulin/smart-calculator';
import { IOBTracker } from '@/components/insulin/iob-tracker';
import { Syringe, History, Upload } from 'lucide-react';
import Link from 'next/link';

export default function InsulinPage() {

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Syringe className="w-8 h-8 text-orange-600" />
            Insulin Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Smart dosing calculator with IOB tracking and safety features
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link
            href="/dashboard/insulin/history?upload=true"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
          
          <Link
            href="/dashboard/insulin/history"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <History className="w-4 h-4" />
            View History
          </Link>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column - Calculator & Logger */}
        <div className="space-y-6">
          <SmartCalculator />
        </div>
        
        {/* Right Column - IOB Tracker & Quick Logger */}
        <div className="space-y-6">
          <IOBTracker />
          
          <BolusLogger />
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Insulin Logging - CGM Sensor Tracker',
  description: 'Quick log your bolus insulin doses',
};