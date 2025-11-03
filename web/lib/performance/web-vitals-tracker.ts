import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
  navigationType: string;
}

export interface WebVitalsReport {
  cls: WebVitalsMetric | null;
  fid: WebVitalsMetric | null;
  fcp: WebVitalsMetric | null;
  lcp: WebVitalsMetric | null;
  ttfb: WebVitalsMetric | null;
  timestamp: number;
  url: string;
  userAgent: string;
}

// Thresholds for Core Web Vitals (based on Google's recommendations)
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

class WebVitalsTracker {
  private metrics: Map<string, WebVitalsMetric> = new Map();
  private listeners: Array<(report: WebVitalsReport) => void> = [];

  constructor() {
    this.initializeTracking();
  }

  private initializeTracking() {
    // Track all Core Web Vitals
    onCLS((metric) => this.handleMetric('CLS', metric));
    onINP((metric) => this.handleMetric('INP', metric));
    onFCP((metric) => this.handleMetric('FCP', metric));
    onLCP((metric) => this.handleMetric('LCP', metric));
    onTTFB((metric) => this.handleMetric('TTFB', metric));
  }

  private handleMetric(name: string, metric: any) {
    const webVitalsMetric: WebVitalsMetric = {
      name,
      value: metric.value,
      rating: getRating(name, metric.value),
      timestamp: Date.now(),
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
    };

    this.metrics.set(name, webVitalsMetric);
    this.notifyListeners();
  }

  private notifyListeners() {
    const report = this.generateReport();
    this.listeners.forEach(listener => listener(report));
  }

  public onReport(callback: (report: WebVitalsReport) => void) {
    this.listeners.push(callback);
  }

  public generateReport(): WebVitalsReport {
    return {
      cls: this.metrics.get('CLS') || null,
      fid: this.metrics.get('INP') || null, // INP replaces FID in web-vitals v5
      fcp: this.metrics.get('FCP') || null,
      lcp: this.metrics.get('LCP') || null,
      ttfb: this.metrics.get('TTFB') || null,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  }

  public async sendToAnalytics(report: WebVitalsReport) {
    try {
      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.error('Failed to send Web Vitals to analytics:', error);
    }
  }

  public getMetricSummary() {
    const report = this.generateReport();
    const metrics = [report.cls, report.fid, report.fcp, report.lcp, report.ttfb].filter(Boolean);
    
    const summary = {
      totalMetrics: metrics.length,
      goodMetrics: metrics.filter(m => m?.rating === 'good').length,
      needsImprovementMetrics: metrics.filter(m => m?.rating === 'needs-improvement').length,
      poorMetrics: metrics.filter(m => m?.rating === 'poor').length,
    };

    return {
      ...summary,
      overallScore: summary.totalMetrics > 0 
        ? Math.round((summary.goodMetrics / summary.totalMetrics) * 100)
        : 0,
    };
  }
}

// Singleton instance
export const webVitalsTracker = new WebVitalsTracker();

// Utility function to get current metrics report
export function getCurrentMetrics(): WebVitalsReport {
  return webVitalsTracker.generateReport();
}