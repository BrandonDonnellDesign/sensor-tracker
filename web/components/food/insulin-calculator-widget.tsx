'use client';

import { useState } from 'react';
import { useInsulinCalculatorSettings, calculateTotalInsulin } from '@/lib/hooks/use-insulin-calculator-settings';
import { Calculator, Settings, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface InsulinCalculatorWidgetProps {
  carbs?: number;
  currentGlucose?: number;
  onInsulinCalculated?: (insulin: number) => void;
  className?: string;
}

export function InsulinCalculatorWidget({ 
  carbs = 0, 
  currentGlucose = 100, 
  onInsulinCalculated,
  className = '' 
}: InsulinCalculatorWidgetProps) {
  const { settings, loading, error } = useInsulinCalculatorSettings();
  const [localCarbs, setLocalCarbs] = useState(carbs);
  const [localGlucose, setLocalGlucose] = useState(currentGlucose);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-gray-600 dark:text-slate-400">
              Calculator settings needed
            </span>
          </div>
          <Link
            href="/dashboard/settings?tab=calculator"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Configure →
          </Link>
        </div>
      </div>
    );
  }

  const calculation = calculateTotalInsulin(localCarbs, localGlucose, settings);

  const handleCalculate = () => {
    onInsulinCalculated?.(calculation.totalInsulin);
  };

  return (
    <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900 dark:text-slate-100">
            Insulin Calculator
          </h3>
        </div>
        <Link
          href="/dashboard/settings?tab=calculator"
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
          title="Calculator Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
            Carbs (g)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={localCarbs}
            onChange={(e) => setLocalCarbs(parseFloat(e.target.value) || 0)}
            inputMode="numeric"
            className="w-full px-3 py-2 md:px-2 md:py-1 text-base md:text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 touch-manipulation"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
            Current BG (mg/dL)
          </label>
          <input
            type="number"
            min="50"
            max="400"
            step="1"
            value={localGlucose}
            onChange={(e) => setLocalGlucose(parseFloat(e.target.value) || 100)}
            inputMode="numeric"
            className="w-full px-3 py-2 md:px-2 md:py-1 text-base md:text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 touch-manipulation"
          />
        </div>
      </div>

      {/* Calculation Breakdown */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-slate-400">
            Carb insulin (1:{settings.insulin_to_carb}):
          </span>
          <span className="font-medium text-gray-900 dark:text-slate-100">
            {calculation.carbInsulin}u
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-slate-400">
            Correction (1:{settings.correction_factor}):
          </span>
          <span className="font-medium text-gray-900 dark:text-slate-100">
            {calculation.correctionInsulin}u
          </span>
        </div>
        <div className="border-t border-gray-200 dark:border-slate-600 pt-2">
          <div className="flex justify-between">
            <span className="font-medium text-gray-900 dark:text-slate-100">
              Total Insulin:
            </span>
            <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
              {calculation.totalInsulin}u
            </span>
          </div>
        </div>
      </div>

      {/* Safety Warnings */}
      {calculation.totalInsulin > 10 && (
        <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-200 text-xs">
          ⚠️ High dose detected ({calculation.totalInsulin}u). Please verify calculations.
        </div>
      )}
      
      {localGlucose < 70 && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200 text-xs">
          🚨 Low blood glucose detected. Consider treating hypoglycemia first.
        </div>
      )}

      {calculation.correctionInsulin < 0 && (
        <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-800 dark:text-green-200 text-xs">
          ✓ Blood glucose is at or below target. No correction needed.
        </div>
      )}

      {/* Action Button */}
      {onInsulinCalculated && (
        <button
          onClick={handleCalculate}
          disabled={localGlucose < 70}
          className="w-full px-3 py-3 md:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base md:text-sm font-medium rounded-lg transition-colors touch-manipulation"
        >
          Use This Dose ({calculation.totalInsulin}u)
        </button>
      )}

      {/* Settings Info */}
      <div className="mt-3 text-xs text-gray-500 dark:text-slate-500">
        Target: {settings.target_glucose} mg/dL • 
        I:C {settings.insulin_to_carb} • 
        ISF {settings.correction_factor}
      </div>
    </div>
  );
}