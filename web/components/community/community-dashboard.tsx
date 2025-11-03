'use client';

import { useState, useEffect } from 'react';
import { CommunityTips } from './community-tips';
import { ActivityFeed } from './activity-feed';
import { Leaderboard } from './leaderboard';
import { NotificationSystem } from './notification-system';
import { 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Lightbulb, 
  Award,
  Target,
  Zap,
  BarChart3,
  Clock
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';
import { useAuth } from '@/components/providers/auth-provider';

interface CommunityStats {
  totalTips: number;
  totalComments: number;
  totalUsers: number;
  totalVotes: number;
  weeklyGrowth: {
    tips: number;
    comments: number;
    users: number;
  };
  topCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  userStats?: {
    rank: number;
    totalContributions: number;
    weeklyStreak: number;
    level: number;
    nextLevelProgress: number;
  };
}

interface CommunityDashboardProps {
  className?: string;
}

export function CommunityDashboard({ className = '' }: CommunityDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tips' | 'activity' | 'leaderboard'>('tips');

  useEffect(() => {
    fetchCommunityStats();
  }, []);

  const fetchCommunityStats = async () => {
    try {
      const response = await authenticatedFetch('/api/community/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch community stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600 dark:text-green-400';
    if (growth < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-slate-400';
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    growth, 
    color = 'blue' 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    growth?: number; 
    color?: string; 
  }) => {
    const colorClasses = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    };

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {formatNumber(value)}
            </p>
            {growth !== undefined && (
              <div className={`flex items-center space-x-1 mt-1 ${getGrowthColor(growth)}`}>
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {growth > 0 ? '+' : ''}{growth}% this week
                </span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Content Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Community Hub
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            Connect, share, and learn with fellow CGM users
          </p>
        </div>
        <NotificationSystem />
      </div>

      {/* Community Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Tips"
            value={stats.totalTips}
            icon={Lightbulb}
            growth={stats.weeklyGrowth.tips}
            color="blue"
          />
          <StatCard
            title="Comments"
            value={stats.totalComments}
            icon={MessageCircle}
            growth={stats.weeklyGrowth.comments}
            color="green"
          />
          <StatCard
            title="Community Members"
            value={stats.totalUsers}
            icon={Users}
            growth={stats.weeklyGrowth.users}
            color="purple"
          />
          <StatCard
            title="Total Votes"
            value={stats.totalVotes}
            icon={Award}
            color="orange"
          />
        </div>
      )}

      {/* User Progress Card (if logged in) */}
      {user && stats?.userStats && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Your Progress</h3>
              <p className="text-blue-100">Keep up the great work!</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">#{stats.userStats.rank}</div>
              <div className="text-sm text-blue-100">Community Rank</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-sm">Level {stats.userStats.level}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${stats.userStats.nextLevelProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-blue-100 mt-1">
                {stats.userStats.nextLevelProgress}% to next level
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Streak</span>
              </div>
              <div className="text-xl font-bold">{stats.userStats.weeklyStreak} days</div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm">Contributions</span>
              </div>
              <div className="text-xl font-bold">{stats.userStats.totalContributions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {stats?.topCategories && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Popular Categories
          </h3>
          <div className="space-y-3">
            {stats.topCategories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-blue-500' :
                    index === 1 ? 'bg-green-500' :
                    index === 2 ? 'bg-purple-500' :
                    index === 3 ? 'bg-orange-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 capitalize">
                    {category.category}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-slate-400 w-12 text-right">
                    {category.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'tips', label: 'Community Tips', icon: Lightbulb },
              { key: 'activity', label: 'Recent Activity', icon: Clock },
              { key: 'leaderboard', label: 'Leaderboard', icon: Award }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'tips' && (
            <CommunityTips className="border-0 bg-transparent p-0 shadow-none" />
          )}
          
          {activeTab === 'activity' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActivityFeed showHeader={false} limit={15} />
              </div>
              <div>
                <Leaderboard limit={5} />
              </div>
            </div>
          )}
          
          {activeTab === 'leaderboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Leaderboard limit={20} />
              </div>
              <div>
                <ActivityFeed showHeader={false} limit={10} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}