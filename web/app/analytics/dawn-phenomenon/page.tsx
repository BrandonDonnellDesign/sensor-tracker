'use client';

import { useState } from 'react';
import DawnPhenomenonAnalysis from '@/components/analytics/dawn-phenomenon-analysis';
import { Sunrise, Calendar, TrendingUp, Info } from 'lucide-react';

export default function DawnPhenomenonPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(14);

  const periods = [
    { days: 7, label: '1 Week' },
    { days: 14, label: '2 Weeks' },
    { days: 30, label: '1 Month' },
    { days: 60, label: '2 Months' },
    { days: 90, label: '3 Months' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sunrise className="w-8 h-8 text-orange-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Dawn Phenomenon Analysis
                </h1>
                <p className="text-gray-600 dark:text-slate-400">
                  Understand your morning glucose patterns and optimize your diabetes management
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Analysis Period:
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              >
                {periods.map(period => (
                  <option key={period.days} value={period.days}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* What is Dawn Phenomenon Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What is Dawn Phenomenon?
              </h3>
              <p className="text-blue-800 dark:text-blue-200 text-sm mb-3">
                Dawn phenomenon is a natural rise in blood glucose that occurs in the early morning hours (typically 4-8 AM) 
                due to hormonal changes. Your body releases hormones like cortisol and growth hormone that cause your liver 
                to release stored glucose, preparing you to wake up.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-100 dark:bg-blue-800/30 rounded-lg p-3">
                  <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Normal</div>
                  <div className="text-blue-700 dark:text-blue-300">Rise &lt; 30 mg/dL</div>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-800/30 rounded-lg p-3">
                  <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">Mild-Moderate</div>
                  <div className="text-yellow-700 dark:text-yellow-300">Rise 30-80 mg/dL</div>
                </div>
                <div className="bg-red-100 dark:bg-red-800/30 rounded-lg p-3">
                  <div className="font-medium text-red-900 dark:text-red-100 mb-1">Severe</div>
                  <div className="text-red-700 dark:text-red-300">Rise &gt; 80 mg/dL</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dawn Phenomenon Analysis Component */}
        <DawnPhenomenonAnalysis 
          daysToAnalyze={selectedPeriod}
          className="mb-6"
        />

        {/* Tips and Management Strategies */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Management Strategies
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Lifestyle Approaches</h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Consistent sleep schedule (same bedtime/wake time)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Small protein snack before bed (nuts, cheese)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Morning exercise to help glucose utilization</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Avoid late-night eating (after 8 PM)</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Medical Approaches</h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Adjust basal insulin timing or dose</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Consider insulin pump with dawn phenomenon program</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Split long-acting insulin doses</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Discuss with endocrinologist about medication timing</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Important Note
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Always discuss dawn phenomenon patterns with your healthcare provider before making 
                  insulin adjustments. This analysis is for informational purposes and should not 
                  replace medical advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}