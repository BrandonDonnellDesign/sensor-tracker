// Fallback web vitals implementation with dynamic imports
// Use this if the main web-vitals import fails

interface WebVitalMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// Send analytics data with fallback handling
function sendToAnalyticsFallback(metric: WebVitalMetric) {
  const enhancedMetric = {
    ...metric,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Web Vital (Fallback):', enhancedMetric);
  }

  // Send to backend
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enhancedMetric),
  }).catch(error => {
    console.error('Failed to send web vital (fallback):', error);
  });
}

// Dynamic import with error handling
export async function initWebVitalsFallback() {
  try {
    // Try to dynamically import web-vitals
    const webVitals = await import('web-vitals');
    
    if (webVitals.onCLS) {
      webVitals.onCLS(sendToAnalyticsFallback);
    }
    if (webVitals.onINP) {
      webVitals.onINP(sendToAnalyticsFallback);
    }
    if (webVitals.onFCP) {
      webVitals.onFCP(sendToAnalyticsFallback);
    }
    if (webVitals.onLCP) {
      webVitals.onLCP(sendToAnalyticsFallback);
    }
    if (webVitals.onTTFB) {
      webVitals.onTTFB(sendToAnalyticsFallback);
    }
    
    console.log('✅ Web Vitals (fallback) initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize web vitals (fallback):', error);
    return false;
  }
}

// Basic performance tracking without web-vitals library
export function initBasicPerformanceTracking() {
  if (typeof window === 'undefined') return;
  
  try {
    // Track basic page load metrics
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // Send basic performance data
        fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'page_performance_basic',
            properties: {
              load_time: navigation.loadEventEnd - navigation.fetchStart,
              dom_content_loaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
              first_byte: navigation.responseStart - navigation.fetchStart,
            },
          }),
        }).catch(console.error);
      }
    });
    
    console.log('✅ Basic performance tracking initialized');
  } catch (error) {
    console.error('Failed to initialize basic performance tracking:', error);
  }
}