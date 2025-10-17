'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Map, 
  Users, 
  BarChart3, 
  Settings,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Award,
  UserPlus,
  RefreshCw,
  Shield,
  Database,
  Bell,
  Home
} from 'lucide-react';
import { 
  fetchAdminStats, 
  fetchRecentActivity, 
  type AdminStats,
  type RecentActivity
} from '@/lib/admin-service';

const adminActions = [
  {
    name: 'Manage Roadmap',
    description: 'Update roadmap items, progress, and milestones',
    href: '/admin/roadmap',
    icon: Map,
    color: 'bg-blue-500'
  },
  {
    name: 'User Management',
    description: 'View and manage user accounts and permissions',
    href: '/admin/users',
    icon: Users,
    color: 'bg-green-500'
  },
  {
    name: 'System Analytics',
    description: 'View detailed analytics and usage statistics',
    href: '/admin/analytics',
    icon: BarChart3,
    color: 'bg-purple-500'
  },
  {
    name: 'System Settings',
    description: 'Configure system-wide settings and preferences',
    href: '/admin/settings',
    icon: Settings,
    color: 'bg-orange-500'
  }
];

export function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Middleware handles admin access, fetch data directly
      const [statsData, activityData] = await Promise.all([
        fetchAdminStats(),
        fetchRecentActivity()
      ]);

      setStats(statsData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set fallback data on error
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalSensors: 0,
        activeSensors: 0,
        problematicSensors: 0,
        totalAchievements: 0,
        systemUptime: 99.9,
        roadmapProgress: 0,
        recentSignups: 0,
        avgSensorsPerUser: 0
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string, action: string) => {
    if (action.includes('problematic') || action.includes('issue')) return AlertTriangle;
    
    switch (type) {
      case 'user': return action.includes('registered') ? UserPlus : Users;
      case 'sensor': return Activity;
      case 'system': return Settings;
      case 'roadmap': return Map;
      case 'achievement': return Award;
      default: return Bell;
    }
  };

  const getActivityColor = (type: string, action: string) => {
    if (action.includes('problematic') || action.includes('issue')) return 'bg-red-500';
    
    switch (type) {
      case 'user': return action.includes('registered') ? 'bg-green-500' : 'bg-blue-500';
      case 'sensor': return 'bg-blue-500';
      case 'system': return 'bg-orange-500';
      case 'roadmap': return 'bg-purple-500';
      case 'achievement': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-slate-400">Loading dashboard...</span>
      </div>
    );
  }

  const quickStats = stats ? [
    {
      name: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      subValue: `${stats.activeUsers} active`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      name: 'Active Sensors',
      value: stats.activeSensors.toLocaleString(),
      subValue: `${stats.totalSensors} total`,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      name: 'Recent Signups',
      value: stats.recentSignups.toLocaleString(),
      subValue: 'Last 7 days',
      icon: UserPlus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      name: 'Achievements',
      value: stats.totalAchievements.toLocaleString(),
      subValue: 'Total earned',
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    {
      name: 'Avg Sensors/User',
      value: stats.avgSensorsPerUser.toString(),
      subValue: 'Per user',
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
    {
      name: 'System Health',
      value: stats.systemUptime + '%',
      subValue: 'Uptime',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
    }
  ] : [];

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link 
          href="/dashboard"
          className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Real-time overview of system status and user activity
          </p>
        </div>
        
        <button
          onClick={loadDashboardData}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.name === 'Active Sensors' && stats && stats.problematicSensors > 0 && (
                  <div className="flex items-center text-red-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">{stats.problematicSensors} issues</span>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  {stat.subValue}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Admin Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Link
                  href={action.href}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-200 group block h-full"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                        {action.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Recent Activity
          </h2>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {recentActivity.length} recent events
          </span>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {recentActivity.map((activity, index) => {
                const ActivityIcon = getActivityIcon(activity.type, activity.action);
                const isImportant = activity.action.includes('problematic') || activity.action.includes('issue');
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                      isImportant ? 'border-l-4 border-red-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 ${getActivityColor(activity.type, activity.action)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <ActivityIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-medium truncate ${
                            isImportant 
                              ? 'text-red-700 dark:text-red-300' 
                              : 'text-gray-900 dark:text-slate-100'
                          }`}>
                            {activity.action}
                            {isImportant && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                Attention
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 ml-2">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimestamp(activity.timestamp)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {activity.details}
                        </p>
                        {activity.user_email && (
                          <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-slate-500">
                            <Users className="w-3 h-3 mr-1" />
                            {activity.user_email}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No recent activity
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                System activity will appear here as it happens.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}