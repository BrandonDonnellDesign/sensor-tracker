'use client';

import { useEffect } from 'react';
import { initWebVitals, trackPageLoad } from '@/lib/analytics/web-vitals';
import { initWebVitalsFallback, initBasicPerformanceTracking } from '@/lib/analytics/web-vitals-fallback';
import { logger } from '@/lib/logger';

export function WebVitalsTracker() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const initializeTracking = async () => {
      try {
        // Try main web vitals implementation first
        initWebVitals();
        trackPageLoad();
        
        logger.debug('Main web vitals tracking initialized');
      } catch (error) {
        logger.warn('Main web vitals failed, trying fallback:', error);
        
        try {
          // Try fallback implementation
          const fallbackSuccess = await initWebVitalsFallback();
          
          if (!fallbackSuccess) {
            // If fallback also fails, use basic tracking
            logger.warn('Fallback failed, using basic performance tracking');
            initBasicPerformanceTracking();
          }
        } catch (fallbackError) {
          logger.error('All web vitals implementations failed:', fallbackError);
          // Still try basic performance tracking as last resort
          initBasicPerformanceTracking();
        }
      }
    };
    
    // Initialize tracking
    initializeTracking();
    
    // Track route changes (for SPA navigation)
    const handleRouteChange = () => {
      try {
        // Track custom metrics for route changes
        // const navigationStart = performance.now();
        
        // Use requestIdleCallback to measure when the page is interactive
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            // const interactiveTime = performance.now() - navigationStart;
            // trackCustomMetric('route_change_time', interactiveTime);
          });
        }
      } catch (error) {
        logger.error('Error in route change tracking:', error);
      }
    };

    // Listen for route changes (Next.js specific)
    window.addEventListener('beforeunload', handleRouteChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleRouteChange);
    };
  }, []);

  // This component doesn't render anything
  return null;
}