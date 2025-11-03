'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb, 
  Target,
  Activity,
  Award,
  Eye,
  ChevronRight,
  X,
  Sparkles
} from 'lucide-react';
import { useInsights, type Insight, type InsightData } from '@/lib/ai/insights-engine';

interface AIInsightsPanelProps {
  data: InsightData;
  className?: string;
}

export const AIInsightsPanel = memo(function AIInsightsPanel({ 
  data, 
  className = '' 
}: AIInsightsPanelProps) {
  const { insights, loading } = useInsights(data);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const dismissInsight = useCallback((insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  }, []);

  const toggleExpanded = useCallback((insightId: string) => {
    setExpandedInsight(prev => prev === insightId ? null : insightId);
  }, []);

  const visibleInsights = useMemo(() => 
    insights.filter(insight => !dismissedInsights.has(insight.id)),
    [insights, dismissedInsights]
  );

  const getInsightIcon = useCallback((insight: Insight) => {
    const iconClass = "w-5 h-5";
    
    switch (insight.type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
      case 'info':
        return <Eye className={`${iconClass} text-blue-500`} />;
      case 'tip':
        return <Lightbulb className={`${iconClass} text-purple-500`} />;
      default:
        return <Brain className={`${iconClass} text-gray-500`} />;
    }
  }, []);

  const getCategoryIcon = useCallback((category: string) => {
    const iconClass = "w-4 h-4";
    
    switch (category) {
      case 'performance':
        return <TrendingUp className={`${iconClass} text-blue-500`} />;
      case 'health':
        return <Activity className={`${iconClass} text-green-500`} />;
      case 'optimization':
        return <Target className={`${iconClass} text-purple-500`} />;
      case 'achievement':
        return <Award className={`${iconClass} text-yellow-500`} />;
      case 'prediction':
        return <Sparkles className={`${iconClass} text-indigo-500`} />;
      default:
        return <Brain className={`${iconClass} text-gray-500`} />;
    }
  }, []);

  const getInsightBorderColor = useCallback((insight: Insight) => {
    switch (insight.type) {
      case 'success':
        return 'border-l-green-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
      case 'tip':
        return 'border-l-purple-500';
      default:
        return 'border-l-gray-500';
    }
  }, []);

  const getPriorityBadge = useCallback((priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
            Low
          </span>
        );
      default:
        return null;
    }
  }, []);

  const insightsByCategory = useMemo(() => {
    const categories = visibleInsights.reduce((acc, insight) => {
      if (!acc[insight.category]) {
        acc[insight.category] = [];
      }
      acc[insight.category].push(insight);
      return acc;
    }, {} as Record<string, Insight[]>);

    // Sort categories by priority
    const categoryOrder = ['performance', 'health', 'prediction', 'achievement', 'optimization'];
    return categoryOrder.reduce((acc, category) => {
      if (categories[category]) {
        acc[category] = categories[category];
      }
      return acc;
    }, {} as Record<string, Insight[]>);
  }, [visibleInsights]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            AI Insights
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visibleInsights.length === 0) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            AI Insights
          </h3>
        </div>
        <div className="text-center py-6">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            All good! No insights to show right now.
          </p>
          <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">
            Keep tracking sensors to unlock personalized insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            AI Insights
          </h3>
        </div>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          {visibleInsights.length}
        </span>
      </div>

      <div className="space-y-4">
        {Object.entries(insightsByCategory).map(([category, categoryInsights]) => (
          <div key={category}>
            <div className="flex items-center space-x-2 mb-2">
              {getCategoryIcon(category)}
              <h4 className="text-xs font-medium text-gray-700 dark:text-slate-300 capitalize">
                {category}
              </h4>
              <span className="text-xs text-gray-500 dark:text-slate-500">
                ({categoryInsights.length})
              </span>
            </div>
            
            <div className="space-y-2">
              {categoryInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`border-l-4 ${getInsightBorderColor(insight)} bg-gray-50 dark:bg-slate-700/50 rounded-r-lg p-3 transition-all duration-200 hover:shadow-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getInsightIcon(insight)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {insight.title}
                          </h5>
                          {getPriorityBadge(insight.priority)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                          {insight.description}
                        </p>
                        
                        {insight.actionable && insight.action && (
                          <div className="flex items-center space-x-3">
                            {insight.action.url ? (
                              <a
                                href={insight.action.url}
                                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                              >
                                {insight.action.label}
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </a>
                            ) : insight.action.handler ? (
                              <button
                                onClick={insight.action.handler}
                                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                              >
                                {insight.action.label}
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </button>
                            ) : null}
                            
                            <div className="flex items-center text-xs text-gray-500 dark:text-slate-500">
                              <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                            </div>
                          </div>
                        )}

                        {/* Expandable metadata */}
                        {insight.metadata && (
                          <button
                            onClick={() => toggleExpanded(insight.id)}
                            className="text-xs text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 mt-2"
                          >
                            {expandedInsight === insight.id ? 'Hide details' : 'Show details'}
                          </button>
                        )}

                        {expandedInsight === insight.id && insight.metadata && (
                          <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600">
                            <h6 className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">
                              Technical Details:
                            </h6>
                            <pre className="text-xs text-gray-600 dark:text-slate-400 overflow-x-auto">
                              {JSON.stringify(insight.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                      title="Dismiss insight"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Insights Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-500">
          <span>
            Insights generated from {data.sensors.length} sensor{data.sensors.length !== 1 ? 's' : ''}
          </span>
          <span>
            Powered by AI Analysis
          </span>
        </div>
      </div>
    </div>
  );
});