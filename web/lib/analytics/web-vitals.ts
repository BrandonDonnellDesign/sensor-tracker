import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

interface AnalyticsEvent extends Metric {
  // Extends the web-vitals Metric interface
}

// Throttle web vitals to prevent spam
const sentMetrics = new Set<string>();
const THROTTLE_DURATION = 30000; // 30 seconds

// Send analytics data to your preferred service
function sendToAnalytics(metric: AnalyticsEvent) {
  // Create a unique key for this metric type and page
  const metricKey = `${metric.name}_${window.location.pathname}`;
  
  // Skip if we've sent this metric recently
  if (sentMetrics.has(metricKey)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚫 Throttled Web Vital:', metric.name);
    }
    return;
  }
  
  // Mark as sent and set timeout to clear
  sentMetrics.add(metricKey);
  setTimeout(() => sentMetrics.delete(metricKey), THROTTLE_DURATION);

  // Enhanced metric with additional context
  const enhancedMetric = {
    ...metric,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Web Vital:', enhancedMetric);
  }

  // Send to your backend for analysis
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enhancedMetric),
  }).catch(error => {
    console.error('Failed to send web vital:', error);
    // Remove from sent set so it can be retried
    sentMetrics.delete(metricKey);
  });
}

export function initWebVitals() {
  try {
    // Initialize web vitals tracking (using new API)
    if (typeof onCLS === 'function') {
      onCLS(sendToAnalytics);
    }
    if (typeof onINP === 'function') {
      onINP(sendToAnalytics); // INP replaces FID in newer versions
    }
    if (typeof onFCP === 'function') {
      onFCP(sendToAnalytics);
    }
    if (typeof onLCP === 'function') {
      onLCP(sendToAnalytics);
    }
    if (typeof onTTFB === 'function') {
      onTTFB(sendToAnalytics);
    }
    
    // Retry disabled to reduce API calls
    // retryFailedMetrics();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Web Vitals tracking initialized');
    }
  } catch (error) {
    console.error('Failed to initialize Web Vitals:', error);
  }
}



// Track custom metric as user event
export function trackCustomMetric(name: string, value: number) {
  fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'custom_metric',
      properties: {
        metric_name: name,
        metric_value: value,
      },
    }),
  }).catch(console.error);
}

// Track page load performance
export function trackPageLoad() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // Track as custom events instead of web vitals
        const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        const firstByte = navigation.responseStart - navigation.fetchStart;
        
        // Send as user events instead
        fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'page_performance',
            properties: {
              page_load_time: pageLoadTime,
              dom_content_loaded: domContentLoaded,
              first_byte: firstByte,
            },
          }),
        }).catch(console.error);
      }
    });
  }
}