import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentMounts: number;
  rerenders: number;
  memoryUsage?: number;
}

interface UsePerformanceOptions {
  trackMemory?: boolean;
  logToConsole?: boolean;
  componentName?: string;
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    trackMemory = false,
    logToConsole = process.env.NODE_ENV === 'development',
    componentName = 'Component'
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentMounts: 0,
    rerenders: 0,
  });

  const renderStartTime = useRef<number>(0);
  const mountCount = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Track render start time
  renderStartTime.current = performance.now();
  renderCount.current += 1;

  useEffect(() => {
    // Component mounted
    mountCount.current += 1;
    
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    const newMetrics: PerformanceMetrics = {
      renderTime,
      componentMounts: mountCount.current,
      rerenders: renderCount.current - 1, // Subtract 1 for initial render
    };

    // Track memory usage if supported and enabled
    if (trackMemory && 'memory' in performance) {
      const memInfo = (performance as any).memory;
      newMetrics.memoryUsage = memInfo.usedJSHeapSize;
    }

    setMetrics(newMetrics);

    if (logToConsole) {
      console.group(`🔍 Performance Metrics - ${componentName}`);
      console.log(`Render time: ${renderTime.toFixed(2)}ms`);
      console.log(`Component mounts: ${mountCount.current}`);
      console.log(`Re-renders: ${renderCount.current - 1}`);
      if (newMetrics.memoryUsage) {
        console.log(`Memory usage: ${(newMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }
      console.groupEnd();
    }
  });

  return metrics;
}

// Hook for measuring function execution time
export function useExecutionTime() {
  const measure = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    name?: string
  ) => {
    return (...args: T): R => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name || 'Function'} execution time: ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    };
  }, []);

  const measureAsync = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    name?: string
  ) => {
    return async (...args: T): Promise<R> => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name || 'Async Function'} execution time: ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    };
  }, []);

  return { measure, measureAsync };
}