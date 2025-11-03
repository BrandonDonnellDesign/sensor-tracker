import { PerformanceDashboard } from '@/components/admin/performance-dashboard';
import { PerformanceGuide } from '@/components/admin/performance-guide';
import { DatabaseMaintenance } from '@/components/admin/database-maintenance';

export default function AdminPerformancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Performance Monitoring</h1>
          <p className="text-slate-400">
            Real-time Core Web Vitals and performance metrics
          </p>
        </div>
      </div>
      
      <PerformanceDashboard />
      <DatabaseMaintenance />
      <PerformanceGuide />
    </div>
  );
}