import React from 'react';
import { Settings, Clock, Zap } from 'lucide-react';

export function DexcomIntegrationComingSoon() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="text-center py-12">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <Settings className="h-16 w-16 text-gray-300 dark:text-slate-600" />
            <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
          Dexcom Integration
        </h3>
        
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mb-4">
          <Zap className="h-3 w-3 mr-1" />
          Coming Soon
        </div>
        
        <p className="text-gray-600 dark:text-slate-400 max-w-md mx-auto mb-6">
          Automatic sensor data sync from your Dexcom account is currently in development. 
          This feature will allow you to automatically import sensor information, eliminating manual entry.
        </p>
        
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 max-w-sm mx-auto">
          <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">
            Planned Features:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
            <li>• Automatic sensor detection</li>
            <li>• Real-time sync with Dexcom</li>
            <li>• Device status monitoring</li>
            <li>• Seamless data integration</li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-slate-500 mt-6">
          Stay tuned for updates in future releases
        </p>
      </div>
    </div>
  );
}