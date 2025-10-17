import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { GamificationAdminClient } from '@/components/admin/gamification-admin';

export default function GamificationAdminPage() {

  return (
    <AdminGuard>
      <div className="space-y-8">
        {/* Navigation */}
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link 
            href="/admin"
            className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Admin Panel</span>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            Gamification Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Manage achievements, user statistics, and gamification features
          </p>
        </div>

        <GamificationAdminClient />
      </div>
    </AdminGuard>
  );
}