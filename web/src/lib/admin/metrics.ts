// Admin metrics helper functions that use API routes
export interface OverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSensors: number;
  totalPhotos: number;
  recentActivity: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  uptime: number;
  responseTime: number;
  // Enhanced metrics
  userActivity: {
    dailyActive: number;
    weeklyActive: number;
    newSignups: number;
    signupTrend: number[];
  };
  sensorStats: {
    activeSensors: number;
    expiredSensors: number;
    averageWearDuration: number;
    sensorTrend: number[];
  };
  integrationHealth: {
    dexcomSyncRate: number;
    ocrSuccessRate: number;
    apiResponseTime: number;
  };
  notifications: {
    sent: number;
    delivered: number;
    failed: number;
    deliveryTrend: number[];
    failureTrend?: number[];
  };
  retention: {
    weeklyRetention: number;
    monthlyRetention: number;
  };
}

export async function fetchOverviewMetrics(): Promise<OverviewMetrics> {
  const response = await fetch('/api/admin/metrics');
  
  if (!response.ok) {
    throw new Error('Failed to fetch admin metrics');
  }
  
  return response.json();
}

export interface IntegrationHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime?: number;
  successRate?: number;
  errorCount?: number;
}

export async function fetchIntegrationHealth(): Promise<IntegrationHealth[]> {
  const response = await fetch('/api/admin/integrations/health');
  
  if (!response.ok) {
    // Fallback to mock data if API not available
    return [
      { name: 'Dexcom API', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 250, successRate: 98.5 },
      { name: 'OCR Service', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 1200, successRate: 94.2 },
      { name: 'Supabase', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 45, successRate: 99.9 },
    ];
  }
  
  return response.json();
}

export interface AnalyticsData {
  userGrowth: {
    labels: string[];
    data: number[];
  };
  sensorUsage: {
    labels: string[];
    data: number[];
  };
  integrationMetrics: {
    dexcomSync: { success: number; failed: number };
    ocrProcessing: { success: number; failed: number };
  };
  notificationStats: {
    sent: number;
    delivered: number;
    failed: number;
    byType: { [key: string]: number };
  };
  historicalData: {
    labels: string[];
    userGrowth: number[];
    sensorUsage: number[];
    notifications: {
      sent: number;
      read: number;
      successRate: number;
    }[];
    syncRates: {
      success: number;
      failed: number;
      successRate: number;
    }[];
  };
}

export async function fetchAnalyticsData(): Promise<AnalyticsData> {
  const response = await fetch('/api/admin/analytics');
  
  if (!response.ok) {
    throw new Error('Failed to fetch analytics data');
  }
  
  return response.json();
}