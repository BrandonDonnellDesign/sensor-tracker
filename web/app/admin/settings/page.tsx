import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminSettingsClient } from '@/components/admin/admin-settings-client';

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
          System Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Configure system-wide settings, preferences, and maintenance options
        </p>
      </div>

      <AdminSettingsClient />
      </div>
    </AdminGuard>
  );
}