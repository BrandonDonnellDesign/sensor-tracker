'use client';

import { memo, useEffect, useState, useCallback } from 'react';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';

interface ComponentPerformanceData {
  name: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoryUsage?: number;
}

interface PerformanceMonitorEnhancedProps {
  trackComponents?: string[];
  showDetails?: boolean;
}

export const PerformanceMonitorEnhanced = memo(function PerformanceMonitorEnhanced({ 
  trackComponents: _trackComponents = [], 
  showDetails = false 
}: PerformanceMonitorEnhancedProps) {
  const { metrics, getPerformanceScore } = usePerformanceMonitor();
  const [componentData, setComponentData] = useState<ComponentPerformanceData[]>([]);
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  // Track memory usage
  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo((performance as any).memory);
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mock component performance tracking (in real app, this would come from actual tracking)
  useEffect(() => {
    const mockData: ComponentPerformanceData[] = [
      {
        name: 'EnhancedStatsGrid',
        renderCount: 12,
        averageRenderTime: 2.3,
        lastRenderTime: 1.8,
        memoryUsage: 0.5,
      },
      {
        name: 'GamificationWidget',
        renderCount: 8,
        averageRenderTime: 4.1,
        lastRenderTime: 3.2,
        memoryUsage: 1.2,
      },
      {
        name: 'SensorCard',
        renderCount: 24,
        averageRenderTime: 1.1,
        lastRenderTime: 0.9,
        memoryUsage: 0.3,
      },
    ];
    setComponentData(mockData);
  }, []);

  const performanceScore = getPerformanceScore();

  const formatBytes = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getPerformanceColor = useCallback((value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'text-green-600 dark:text-green-400';
    if (value <= thresholds.poor) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          Performance Monitor
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            performanceScore.overallScore >= 80 ? 'bg-green-500' :
            performanceScore.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Score: {performanceScore.overallScore}%
          </span>
        </div>
      </div>

      {/* Web Vitals Summary */}
      {metrics.webVitals && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
            Core Web Vitals
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'CLS', value: metrics.webVitals.cls?.value, unit: '', thresholds: { good: 0.1, poor: 0.25 } },
              { name: 'FID', value: metrics.webVitals.fid?.value, unit: 'ms', thresholds: { good: 100, poor: 300 } },
              { name: 'FCP', value: metrics.webVitals.fcp?.value, unit: 'ms', thresholds: { good: 1800, poor: 3000 } },
              { name: 'LCP', value: metrics.webVitals.lcp?.value, unit: 'ms', thresholds: { good: 2500, poor: 4000 } },
              { name: 'TTFB', value: metrics.webVitals.ttfb?.value, unit: 'ms', thresholds: { good: 800, poor: 1800 } },
            ].map((metric) => (
              <div key={metric.name} className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{metric.name}</p>
                <p className={`text-lg font-bold ${
                  metric.value ? getPerformanceColor(metric.value, metric.thresholds) : 'text-gray-400'
                }`}>
                  {metric.value ? `${metric.value.toFixed(metric.name === 'CLS' ? 3 : 0)}${metric.unit}` : '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Component Performance */}
      {showDetails && componentData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
            Component Performance
          </h4>
          <div className="space-y-3">
            {componentData.map((component) => (
              <div key={component.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {component.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {component.renderCount} renders • Avg: {component.averageRenderTime.toFixed(1)}ms
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${getPerformanceColor(component.lastRenderTime, { good: 16, poor: 50 })}`}>
                    {component.lastRenderTime.toFixed(1)}ms
                  </p>
                  {component.memoryUsage && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {component.memoryUsage.toFixed(1)}MB
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory Usage */}
      {memoryInfo && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
            Memory Usage
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Used</p>
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {formatBytes(memoryInfo.usedJSHeapSize)}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Total</p>
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {formatBytes(memoryInfo.totalJSHeapSize)}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Limit</p>
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {formatBytes(memoryInfo.jsHeapSizeLimit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Render Performance */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
          Render Performance
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Render Time</p>
            <p className={`text-lg font-bold ${getPerformanceColor(metrics.renderTime, { good: 16, poor: 50 })}`}>
              {metrics.renderTime.toFixed(1)}ms
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Component Mounts</p>
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {metrics.componentMounts}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      {performanceScore.overallScore < 80 && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Performance Tips
          </h5>
          <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
            {performanceScore.poorMetrics > 0 && (
              <li>• Consider optimizing components with poor Web Vitals scores</li>
            )}
            {metrics.renderTime > 16 && (
              <li>• Render time exceeds 16ms - consider using React.memo or useMemo</li>
            )}
            {memoryInfo && memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8 && (
              <li>• Memory usage is high - check for memory leaks</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
});