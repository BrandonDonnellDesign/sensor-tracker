import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { RoadmapAdmin } from '@/components/admin/roadmap-admin';

export default function RoadmapAdminPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center space-x-4 mb-8">
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            Roadmap Administration
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Manage roadmap items, update progress, and track development milestones
          </p>
        </div>

        <RoadmapAdmin />
      </div>
      </div>
    </AdminGuard>
  );
}