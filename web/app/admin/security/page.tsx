'use client';

import { AdminGuard } from '@/components/admin/admin-guard';
import { SecurityManagement } from '@/components/admin/security-management';

export default function AdminSecurityPage() {
  return (
    <AdminGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            Security Center
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">
            Advanced security monitoring, threat detection, and incident response
          </p>
        </div>
        
        <SecurityManagement />
      </div>
    </AdminGuard>
  );
}