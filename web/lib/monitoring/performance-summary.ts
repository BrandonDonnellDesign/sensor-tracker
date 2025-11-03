// Lightweight performance summary for occasional collection
export class PerformanceSummary {
  private static instance: PerformanceSummary;
  
  static getInstance(): PerformanceSummary {
    if (!PerformanceSummary.instance) {
      PerformanceSummary.instance = new PerformanceSummary();
    }
    return PerformanceSummary.instance;
  }

  // Collect summary once per session (not per page)
  async collectSessionSummary(): Promise<void> {
    const sessionKey = 'perf_summary_collected';
    
    // Only collect once per session
    if (sessionStorage.getItem(sessionKey)) {
      return;
    }

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const summary = {
          session_id: crypto.randomUUID(),
          page_load_time: navigation.loadEventEnd - navigation.fetchStart,
          dom_ready: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          first_byte: navigation.responseStart - navigation.fetchStart,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        };

        // Send once per session, not per page
        await fetch('/api/analytics/session-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(summary),
        });

        sessionStorage.setItem(sessionKey, 'true');
      }
    } catch (error) {
      console.error('Failed to collect performance summary:', error);
    }
  }

  // Collect critical issues only (not routine metrics)
  reportCriticalIssue(issue: string, details: any): void {
    fetch('/api/analytics/critical-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue,
        details,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      }),
    }).catch(console.error);
  }
}

export const performanceSummary = PerformanceSummary.getInstance();