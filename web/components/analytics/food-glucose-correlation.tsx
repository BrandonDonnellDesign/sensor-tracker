'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface FoodImpact {
  food_name: string;
  occurrences: number;
  avg_glucose_before: number;
  avg_glucose_after: number;
  avg_spike: number;
  max_spike: number;
  min_spike: number;
  avg_carbs: number;
  spike_per_carb: number;
  consistency_score: number;
}

export function FoodGlucoseCorrelation() {
  const [data, setData] = useState<FoodImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState<'spike' | 'consistency' | 'efficiency'>('spike');

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/food-glucose-correlation?days=${days}`);
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error loading correlation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedData = () => {
    const sorted = [...data];
    switch (sortBy) {
      case 'spike':
        return sorted.sort((a, b) => b.avg_spike - a.avg_spike);
      case 'consistency':
        return sorted.sort((a, b) => b.consistency_score - a.consistency_score);
      case 'efficiency':
        return sorted.sort((a, b) => b.spike_per_carb - a.spike_per_carb);
      default:
        return sorted;
    }
  };

  const getSpikeColor = (spike: number) => {
    if (spike < 20) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (spike < 40) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  const getSpikeIcon = (spike: number) => {
    if (spike < 20) return <CheckCircle className="h-5 w-5" />;
    if (spike < 40) return <Activity className="h-5 w-5" />;
    return <AlertTriangle className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mr-2">
              Time Period:
            </label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mr-2">
              Sort By:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            >
              <option value="spike">Highest Spike</option>
              <option value="consistency">Most Consistent</option>
              <option value="efficiency">Spike per Carb</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-800 dark:text-red-300">Highest Spike</span>
            <TrendingUp className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-900 dark:text-red-200">
            {data[0]?.food_name || 'N/A'}
          </div>
          <div className="text-sm text-red-700 dark:text-red-400">
            +{Math.round(data[0]?.avg_spike || 0)} mg/dL avg
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800 dark:text-green-300">Lowest Spike</span>
            <TrendingDown className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-200">
            {data[data.length - 1]?.food_name || 'N/A'}
          </div>
          <div className="text-sm text-green-700 dark:text-green-400">
            +{Math.round(data[data.length - 1]?.avg_spike || 0)} mg/dL avg
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Foods Analyzed</span>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
            {data.length}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-400">
            Over {days} days
          </div>
        </div>
      </div>

      {/* Food List */}
      <div className="space-y-3">
        {getSortedData().map((food) => (
          <div
            key={food.food_name}
            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {food.food_name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-slate-400">
                    ({food.occurrences} times)
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Avg Spike:</span>
                    <div className={`font-semibold ${getSpikeColor(food.avg_spike)} inline-flex items-center px-2 py-1 rounded ml-2`}>
                      {getSpikeIcon(food.avg_spike)}
                      <span className="ml-1">+{Math.round(food.avg_spike)} mg/dL</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Range:</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100 ml-2">
                      {Math.round(food.min_spike)} - {Math.round(food.max_spike)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Avg Carbs:</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100 ml-2">
                      {Math.round(food.avg_carbs)}g
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-600 dark:text-slate-400">Consistency:</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100 ml-2">
                      {food.consistency_score}%
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-500 dark:text-slate-500">
                  Spike per carb: {food.spike_per_carb.toFixed(1)} mg/dL per gram
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Not enough data to analyze food-glucose correlation.</p>
          <p className="text-sm mt-2">Log more meals with glucose readings to see insights.</p>
        </div>
      )}
    </div>
  );
}
