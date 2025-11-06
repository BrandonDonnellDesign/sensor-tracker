import { BolusLogger } from '@/components/insulin/bolus-logger';
import { SmartCalculator } from '@/components/insulin/smart-calculator';
import { IOBTracker } from '@/components/insulin/iob-tracker';
import { GlucosePredictor } from '@/components/glucose/glucose-predictor';
import { Syringe, History, Upload, Shield } from 'lucide-react';
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        {/* Mobile: IOB Tracker first for quick reference */}
        <div className="xl:order-2 space-y-4 lg:space-y-6">
          {/* Safety Prediction - Critical for insulin management */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800 dark:text-green-300">Safety Monitoring</h3>
              <Link 
                href="/dashboard/glucose-data" 
                className="ml-auto text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                View Full Predictions →
              </Link>
            </div>
            <GlucosePredictor 
              autoRefresh={true}
              refreshInterval={300}
            />
          </div>
          
          <IOBTracker />
          
          <BolusLogger />
        </div>
        
        {/* Mobile: Calculator second */}
        <div className="xl:order-1 space-y-4 lg:space-y-6">
          <SmartCalculator />
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Insulin Logging - CGM Sensor Tracker',
  description: 'Quick log your bolus insulin doses',
};