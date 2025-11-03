'use client';

import { 
  UtensilsCrossed, 
  Activity, 
  TrendingUp, 
  BarChart3,
  Brain,
  Target
} from 'lucide-react';

export function AnalyticsSummary() {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
          Comprehensive Analytics Dashboard
        </h3>
      </div>
      
      <p className="text-blue-800 dark:text-blue-200 mb-4">
        Your analytics dashboard now includes comprehensive food and nutrition tracking alongside your sensor data.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Sensor Analytics</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Track CGM performance, patterns, and sensor success rates
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <UtensilsCrossed className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Food Analytics</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Nutrition trends, meal patterns, and macro breakdowns
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Glucose-Food Correlation</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              See how different foods impact your glucose levels
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">AI Insights</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Personalized recommendations and pattern recognition
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Target className="w-4 h-4" />
          <span>Start logging food to unlock detailed nutrition insights and glucose correlations</span>
        </div>
      </div>
    </div>
  );
}