import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <AdminDashboardClient />
    </AdminGuard>
  );
}