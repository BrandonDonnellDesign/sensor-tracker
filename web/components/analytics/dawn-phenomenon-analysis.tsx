'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { dawnPhenomenonDetector, DawnPhenomenonAnalysis } from '@/lib/analytics/dawn-phenomenon-detector';
import { 
  Sunrise, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Calendar,
  BarChart3,
  RefreshCw,
  Info
} from 'lucide-react';

interface DawnPhenomenonAnalysisProps {
  className?: string;
  daysToAnalyze?: number;
}

export default function DawnPhenomenonAnalysisComponent({ 
  className = '', 
  daysToAnalyze = 14 
}: DawnPhenomenonAnalysisProps) {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<DawnPhenomenonAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      analyzeDawnPhenomenon();
    }
  }, [user?.id, daysToAnalyze]);

  const analyzeDawnPhenomenon = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await dawnPhenomenonDetector.analyzeDawnPhenomenon(user.id, daysToAnalyze);
      setAnalysis(result);
    } catch (err) {
      console.error('Dawn phenomenon analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze dawn phenomenon');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'none': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'mild': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'moderate': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
      case 'severe': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'worsening': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'none': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'mild': return <Info className="w-5 h-5 text-yellow-500" />;
      case 'moderate': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'severe': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <Sunrise className="w-6 h-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Dawn Phenomenon Analysis
          </h3>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400 font-medium">Analysis Error</p>
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          <button
            onClick={analyzeDawnPhenomenon}
            className="mt-3 inline-flex items-center px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Sunrise className="w-6 h-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Dawn Phenomenon Analysis
          </h3>
        </div>
        <button
          onClick={analyzeDawnPhenomenon}
          className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-slate-400">Days Analyzed</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {analysis.daysAnalyzed}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-slate-400">Dawn Phenomenon</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {analysis.dawnPhenomenonPercentage.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-500">
            {analysis.dawnPhenomenonDays} of {analysis.daysAnalyzed} days
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-600 dark:text-slate-400">Avg Rise</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {analysis.averageDawnRise.toFixed(0)} mg/dL
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-500">
            Max: {analysis.maxDawnRise.toFixed(0)} mg/dL
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600 dark:text-slate-400">Typical Time</span>
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-slate-100 mt-1">
            {analysis.typicalRiseTime}
          </div>
        </div>
      </div>

      {/* Severity Assessment */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-3">
          {getSeverityIcon(analysis.severity)}
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100">
            Severity Assessment
          </h4>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(analysis.severity)}`}>
            {analysis.severity.charAt(0).toUpperCase() + analysis.severity.slice(1)}
          </span>
          <div className="flex items-center space-x-2">
            {getTrendIcon(analysis.recentTrend)}
            <span className="text-sm text-gray-600 dark:text-slate-400">
              Recent trend: {analysis.recentTrend}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Pattern */}
      {analysis.weeklyPattern.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-3">
            Weekly Pattern
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {analysis.weeklyPattern.map((day) => (
              <div key={day.day} className="text-center">
                <div className="text-xs text-gray-600 dark:text-slate-400 mb-1">
                  {day.day.slice(0, 3)}
                </div>
                <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-2">
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {day.percentage.toFixed(0)}%
                  </div>
                  {day.averageRise > 0 && (
                    <div className="text-xs text-gray-500 dark:text-slate-500">
                      +{day.averageRise.toFixed(0)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-3">
            Recommendations
          </h4>
          <div className="space-y-2">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  {recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Info */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
        <p className="text-xs text-gray-500 dark:text-slate-500">
          Analysis based on {analysis.daysAnalyzed} days of glucose data. 
          Dawn phenomenon is detected when morning glucose rises ≥30 mg/dL from overnight levels.
          Last updated: {new Date(analysis.analysisDate).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}