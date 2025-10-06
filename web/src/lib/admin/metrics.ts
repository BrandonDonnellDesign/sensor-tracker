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
}

export async function fetchIntegrationHealth(): Promise<IntegrationHealth[]> {
  // Placeholder - would implement actual health checks
  return [
    { name: 'Dexcom API', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 250 },
    { name: 'OCR Service', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 1200 },
    { name: 'Supabase', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 45 },
  ];
}