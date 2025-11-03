import React, { lazy, ComponentType, LazyExoticComponent } from 'react';

// Enhanced lazy loading with error boundaries and loading states
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    fallback?: React.ComponentType;
    retryCount?: number;
    retryDelay?: number;
  }
): LazyExoticComponent<T> {
  const { retryCount = 3, retryDelay = 1000 } = options || {};

  const retryImport = async (attempt = 0): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return retryImport(attempt + 1);
      }
      throw error;
    }
  };

  return lazy(() => retryImport());
}

// Preload components for better performance
export function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): void {
  // Preload on idle or after a delay
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    });
  } else {
    setTimeout(() => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    }, 100);
  }
}

// Intersection Observer for lazy loading on scroll
export class LazyLoadManager {
  private observer: IntersectionObserver | null = null;
  private loadedComponents = new Set<string>();

  constructor(options?: IntersectionObserverInit) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: '50px',
          threshold: 0.1,
          ...options,
        }
      );
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        const componentId = element.dataset.lazyId;
        
        if (componentId && !this.loadedComponents.has(componentId)) {
          this.loadedComponents.add(componentId);
          const loadFn = element.dataset.lazyLoad;
          
          if (loadFn) {
            try {
              // Execute the lazy load function
              const fn = new Function('return ' + loadFn)();
              if (typeof fn === 'function') {
                fn();
              }
            } catch (error) {
              console.error('Error lazy loading component:', error);
            }
          }
          
          this.observer?.unobserve(element);
        }
      }
    });
  }

  observe(element: HTMLElement, componentId: string, loadFn: () => void) {
    if (this.observer) {
      element.dataset.lazyId = componentId;
      element.dataset.lazyLoad = loadFn.toString();
      this.observer.observe(element);
    }
  }

  unobserve(element: HTMLElement) {
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.loadedComponents.clear();
    }
  }
}

// Global lazy load manager instance
export const lazyLoadManager = new LazyLoadManager();

// Hook for using lazy loading in components
export function useLazyLoad(
  componentId: string,
  loadFn: () => void,
  dependencies: any[] = []
) {
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (element) {
      lazyLoadManager.observe(element, componentId, loadFn);
      
      return () => {
        lazyLoadManager.unobserve(element);
      };
    }
    // Return undefined for the case when element is null
    return undefined;
  }, [componentId, loadFn, ...dependencies]);

  return elementRef;
}

// Performance monitoring for lazy loaded components
export class LazyLoadPerformanceMonitor {
  private loadTimes = new Map<string, number>();
  private startTimes = new Map<string, number>();

  startLoad(componentId: string) {
    this.startTimes.set(componentId, performance.now());
  }

  endLoad(componentId: string) {
    const startTime = this.startTimes.get(componentId);
    if (startTime) {
      const loadTime = performance.now() - startTime;
      this.loadTimes.set(componentId, loadTime);
      this.startTimes.delete(componentId);
      
      // Log slow loads in development
      if (process.env.NODE_ENV === 'development' && loadTime > 1000) {
        console.warn(`Slow lazy load detected for ${componentId}: ${loadTime.toFixed(2)}ms`);
      }
    }
  }

  getLoadTime(componentId: string): number | undefined {
    return this.loadTimes.get(componentId);
  }

  getAllLoadTimes(): Record<string, number> {
    return Object.fromEntries(this.loadTimes);
  }

  getAverageLoadTime(): number {
    const times = Array.from(this.loadTimes.values());
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
}

export const lazyLoadMonitor = new LazyLoadPerformanceMonitor();