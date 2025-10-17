import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminUsersClient } from '@/components/admin/admin-users-client';

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
          User Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          View and manage user accounts, roles, and activity
        </p>
      </div>

      <AdminUsersClient />
      </div>
    </AdminGuard>
  );
}