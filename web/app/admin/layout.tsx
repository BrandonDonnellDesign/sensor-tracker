import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Settings, 
  Map, 
  Users, 
  BarChart3, 
  Shield,
  ArrowLeft,
  Home,
  Award,
  Bell,
  FileText,
  Wrench,
  Link2,
  Database,
  Eye
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Admin Panel | CGM Sensor Tracker',
  description: 'Administration panel for managing the CGM Sensor Tracker application',
};

const adminNavItems = [
  {
    name: 'Overview',
    href: '/admin/overview',
    icon: Eye,
    description: 'System overview & stats'
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management'
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'System analytics'
  },
  {
    name: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
    description: 'Notification management'
  },
  {
    name: 'Logs',
    href: '/admin/logs',
    icon: FileText,
    description: 'System logs & monitoring'
  },
  {
    name: 'Gamification',
    href: '/admin/gamification',
    icon: Award,
    description: 'Manage achievements & stats'
  },
  {
    name: 'Roadmap',
    href: '/admin/roadmap',
    icon: Map,
    description: 'Manage product roadmap'
  },
  {
    name: 'Integrations',
    href: '/admin/integrations',
    icon: Link2,
    description: 'External integrations'
  },
  {
    name: 'Sensor Models',
    href: '/admin/sensor-models',
    icon: Database,
    description: 'Manage sensor models'
  },
  {
    name: 'Maintenance',
    href: '/admin/maintenance',
    icon: Wrench,
    description: 'System maintenance'
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System settings'
  }
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Admin Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-slate-600" />
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Admin Panel
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium rounded-full">
                Admin Access
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Admin Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-4">
                Administration
              </h3>
              <nav className="space-y-2">
                {/* Home Button */}
                <Link
                  href="/admin"
                  className="flex items-center space-x-3 px-3 py-2 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors group border border-blue-200 dark:border-blue-800"
                >
                  <Home className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">Admin Home</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Back to admin dashboard
                    </div>
                  </div>
                </Link>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center space-x-3 px-3 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                    >
                      <Icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-200" />
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}