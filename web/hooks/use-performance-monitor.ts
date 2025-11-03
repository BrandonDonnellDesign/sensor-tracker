import { useEffect, useState, useCallback } from 'react';
import { webVitalsTracker, type WebVitalsReport } from '@/lib/performance/web-vitals-tracker';

export interface PerformanceMetrics {
  webVitals: WebVitalsReport | null;
  renderTime: number;
  componentMounts: number;
  lastUpdate: number;
}

export interface PerformanceConfig {
  trackWebVitals?: boolean;
  trackRenderTime?: boolean;
  sendToAnalytics?: boolean;
  reportInterval?: number;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  trackWebVitals: true,
  trackRenderTime: true,
  sendToAnalytics: true,
  reportInterval: 30000, // 30 seconds
};

export function usePerformanceMonitor(config: PerformanceConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    webVitals: null,
    renderTime: 0,
    componentMounts: 0,
    lastUpdate: Date.now(),
  });

  const [renderStart] = useState(() => performance.now());

  // Track component render time
  useEffect(() => {
    if (finalConfig.trackRenderTime) {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      setMetrics(prev => ({
        ...prev,
        renderTime,
        componentMounts: prev.componentMounts + 1,
        lastUpdate: Date.now(),
      }));
    }
  }, [finalConfig.trackRenderTime, renderStart]);

  // Track Web Vitals
  useEffect(() => {
    if (!finalConfig.trackWebVitals) return;

    const handleWebVitalsReport = (report: WebVitalsReport) => {
      setMetrics(prev => ({
        ...prev,
        webVitals: report,
        lastUpdate: Date.now(),
      }));

      if (finalConfig.sendToAnalytics) {
        webVitalsTracker.sendToAnalytics(report);
      }
    };

    webVitalsTracker.onReport(handleWebVitalsReport);
  }, [finalConfig.trackWebVitals, finalConfig.sendToAnalytics]);

  // Periodic reporting
  useEffect(() => {
    if (!finalConfig.reportInterval) return;

    const interval = setInterval(() => {
      const currentReport = webVitalsTracker.generateReport();
      setMetrics(prev => ({
        ...prev,
        webVitals: currentReport,
        lastUpdate: Date.now(),
      }));
    }, finalConfig.reportInterval);

    return () => clearInterval(interval);
  }, [finalConfig.reportInterval]);

  const getPerformanceScore = useCallback(() => {
    return webVitalsTracker.getMetricSummary();
  }, []);

  const sendManualReport = useCallback(async () => {
    const report = webVitalsTracker.generateReport();
    if (finalConfig.sendToAnalytics) {
      await webVitalsTracker.sendToAnalytics(report);
    }
    return report;
  }, [finalConfig.sendToAnalytics]);

  return {
    metrics,
    getPerformanceScore,
    sendManualReport,
    isTracking: finalConfig.trackWebVitals || finalConfig.trackRenderTime,
  };
}

// Hook for component-specific performance tracking
export function useComponentPerformance(componentName: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [totalRenderTime, setTotalRenderTime] = useState(0);
  const [lastRenderTime, setLastRenderTime] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setRenderCount(prev => prev + 1);
      setTotalRenderTime(prev => prev + renderTime);
      setLastRenderTime(renderTime);

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  const averageRenderTime = renderCount > 0 ? totalRenderTime / renderCount : 0;

  return {
    renderCount,
    totalRenderTime,
    lastRenderTime,
    averageRenderTime,
    componentName,
  };
}

// Hook for tracking user interactions
export function useInteractionTracking() {
  const [interactions, setInteractions] = useState({
    clicks: 0,
    scrolls: 0,
    keyPresses: 0,
    lastInteraction: null as string | null,
  });

  useEffect(() => {
    const handleClick = () => {
      setInteractions(prev => ({
        ...prev,
        clicks: prev.clicks + 1,
        lastInteraction: 'click',
      }));
    };

    const handleScroll = () => {
      setInteractions(prev => ({
        ...prev,
        scrolls: prev.scrolls + 1,
        lastInteraction: 'scroll',
      }));
    };

    const handleKeyPress = () => {
      setInteractions(prev => ({
        ...prev,
        keyPresses: prev.keyPresses + 1,
        lastInteraction: 'keypress',
      }));
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll);
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return interactions;
}