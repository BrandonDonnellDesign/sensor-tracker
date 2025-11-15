'use client';

import { FoodGlucoseCorrelation } from '@/components/analytics/food-glucose-correlation';
import { ArrowLeft, TrendingUp, Info } from 'lucide-react';
import Link from 'next/link';

export default function FoodImpactPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/analytics">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
              Food-Glucose Impact Analysis
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            Discover which foods affect your glucose levels the most
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              How This Works
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Analyzes glucose readings before and after meals (1-2 hours)</li>
              <li>• Calculates average spike for each food you've logged</li>
              <li>• Shows consistency score (how predictable the spike is)</li>
              <li>• Identifies spike per carb ratio (efficiency)</li>
              <li>• Requires at least 2 occurrences of each food with glucose data</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <FoodGlucoseCorrelation />

      {/* Tips */}
      <div className="bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">
          💡 Tips for Better Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-slate-400">
          <div>
            <strong className="text-gray-900 dark:text-slate-100">Log consistently:</strong>
            <p>Record glucose before and 1-2 hours after meals for accurate analysis</p>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-slate-100">Use specific names:</strong>
            <p>Instead of "pasta", use "whole wheat pasta" or "white pasta" for better tracking</p>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-slate-100">Consider portions:</strong>
            <p>Same food in different amounts will have different impacts</p>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-slate-100">Look for patterns:</strong>
            <p>High consistency score means predictable response to that food</p>
          </div>
        </div>
      </div>
    </div>
  );
}
