'use client';

import { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Star,
  BarChart3,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  UserPlus,
  UserMinus,
} from 'lucide-react';

import {
  getAchievements,
  getUserStats,
  getOverviewStats,
  toggleAchievement,
  awardAchievement,
  removeAchievement,
  getUserAchievements,
  type Achievement,
  type UserStats,
  type OverviewStats,
} from '@/lib/gamification-admin-actions';

// Types are now imported from the server actions file

export function GamificationAdminClient() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'achievements' | 'users'
  >('overview');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalUsers: 0,
    totalAchievements: 0,
    totalPointsAwarded: 0,
    activeUsers: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loadingUserAchievements, setLoadingUserAchievements] = useState(false);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      await Promise.all([
        loadAchievements(),
        loadUserStats(),
        loadOverviewStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    try {
      console.log('Client: Loading achievements...');
      const achievementsData = await getAchievements();
      console.log('Client: Received', achievementsData.length, 'achievements');
      setAchievements(achievementsData);
    } catch (error) {
      console.error('Client: Exception loading achievements:', error);
      setAchievements([]);
    }
  };

  const loadUserStats = async () => {
    try {
      console.log('Client: Loading user stats...');
      const userStatsData = await getUserStats();
      console.log('Client: Received', userStatsData.length, 'user stats');
      setUserStats(userStatsData);
    } catch (error) {
      console.error('Client: Exception loading user stats:', error);
      setUserStats([]);
    }
  };

  const loadOverviewStats = async () => {
    try {
      console.log('Client: Loading overview stats...');
      const overviewData = await getOverviewStats();
      console.log('Client: Received overview stats:', overviewData);
      setOverviewStats(overviewData);
    } catch (error) {
      console.error('Client: Exception loading overview stats:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleAchievement = async (
    achievementId: string,
    isActive: boolean
  ) => {
    try {
      console.log(
        'Client: Toggling achievement:',
        achievementId,
        'from',
        isActive,
        'to',
        !isActive
      );
      const result = await toggleAchievement(achievementId, isActive);

      if (result.success) {
        console.log('Client: Achievement toggled successfully');
        await loadAchievements();
      } else {
        console.error('Client: Failed to toggle achievement:', result.error);
      }
    } catch (error) {
      console.error('Client: Exception toggling achievement:', error);
    }
  };

  const openUserModal = async (user: UserStats) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setLoadingUserAchievements(true);

    try {
      const achievements = await getUserAchievements(user.user_id);
      setUserAchievements(achievements);
    } catch (error) {
      console.error('Error loading user achievements:', error);
      setUserAchievements([]);
    } finally {
      setLoadingUserAchievements(false);
    }
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
    setUserAchievements([]);
  };

  const handleAwardAchievement = async (achievementId: string) => {
    if (!selectedUser) return;

    try {
      const result = await awardAchievement(
        selectedUser.user_id,
        achievementId
      );

      if (result.success) {
        console.log('Achievement awarded successfully');
        // Refresh user achievements and stats
        const achievements = await getUserAchievements(selectedUser.user_id);
        setUserAchievements(achievements);
        await loadUserStats();
      } else {
        console.error('Failed to award achievement:', result.error);
        alert(`Failed to award achievement: ${result.error}`);
      }
    } catch (error) {
      console.error('Exception awarding achievement:', error);
      alert('Failed to award achievement');
    }
  };

  const handleRemoveAchievement = async (achievementId: string) => {
    if (!selectedUser) return;

    if (
      !confirm(
        'Are you sure you want to remove this achievement from the user?'
      )
    ) {
      return;
    }

    try {
      const result = await removeAchievement(
        selectedUser.user_id,
        achievementId
      );

      if (result.success) {
        console.log('Achievement removed successfully');
        // Refresh user achievements and stats
        const achievements = await getUserAchievements(selectedUser.user_id);
        setUserAchievements(achievements);
        await loadUserStats();
      } else {
        console.error('Failed to remove achievement:', result.error);
        alert(`Failed to remove achievement: ${result.error}`);
      }
    } catch (error) {
      console.error('Exception removing achievement:', error);
      alert('Failed to remove achievement');
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        <span className='ml-3 text-gray-600 dark:text-slate-400'>
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-slate-100'>
            Gamification Admin
          </h1>
          <p className='text-gray-600 dark:text-slate-400'>
            Manage achievements and user gamification features
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className='flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors'>
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Overview Stats */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600 dark:text-slate-400'>
                Total Users
              </p>
              <p className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
                {overviewStats.totalUsers}
              </p>
            </div>
            <Users className='w-8 h-8 text-blue-600 dark:text-blue-400' />
          </div>
        </div>

        <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600 dark:text-slate-400'>
                Total Achievements
              </p>
              <p className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
                {overviewStats.totalAchievements}
              </p>
            </div>
            <Award className='w-8 h-8 text-green-600 dark:text-green-400' />
          </div>
        </div>

        <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600 dark:text-slate-400'>
                Points Awarded
              </p>
              <p className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
                {overviewStats.totalPointsAwarded.toLocaleString()}
              </p>
            </div>
            <Star className='w-8 h-8 text-yellow-600 dark:text-yellow-400' />
          </div>
        </div>

        <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600 dark:text-slate-400'>
                Active Users
              </p>
              <p className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
                {overviewStats.activeUsers}
              </p>
            </div>
            <BarChart3 className='w-8 h-8 text-purple-600 dark:text-purple-400' />
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700'>
        <div className='border-b border-gray-200 dark:border-slate-700'>
          <nav className='flex space-x-8 px-6'>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}>
              <BarChart3 className='w-4 h-4' />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'achievements'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}>
              <Award className='w-4 h-4' />
              <span>Achievements</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}>
              <Users className='w-4 h-4' />
              <span>Users</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className='p-6'>
          {activeTab === 'overview' && (
            <div className='space-y-6'>
              {/* Achievement System Stats */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='bg-gray-50 dark:bg-slate-700 rounded-lg p-4'>
                  <h4 className='font-semibold text-gray-900 dark:text-slate-100 mb-2'>
                    Achievement Categories
                  </h4>
                  <div className='space-y-1 text-sm'>
                    {Array.from(
                      new Set(achievements.map((a) => a.category))
                    ).map((category) => (
                      <div key={category} className='flex justify-between'>
                        <span className='text-gray-600 dark:text-slate-400 capitalize'>
                          {category}:
                        </span>
                        <span className='font-medium text-gray-900 dark:text-slate-100'>
                          {
                            achievements.filter((a) => a.category === category)
                              .length
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='bg-gray-50 dark:bg-slate-700 rounded-lg p-4'>
                  <h4 className='font-semibold text-gray-900 dark:text-slate-100 mb-2'>
                    Badge Distribution
                  </h4>
                  <div className='space-y-1 text-sm'>
                    {Array.from(
                      new Set(achievements.map((a) => a.badge_color))
                    ).map((color) => (
                      <div key={color} className='flex justify-between'>
                        <span className='text-gray-600 dark:text-slate-400 capitalize'>
                          {color}:
                        </span>
                        <span className='font-medium text-gray-900 dark:text-slate-100'>
                          {
                            achievements.filter((a) => a.badge_color === color)
                              .length
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='bg-gray-50 dark:bg-slate-700 rounded-lg p-4'>
                  <h4 className='font-semibold text-gray-900 dark:text-slate-100 mb-2'>
                    Popular Achievements
                  </h4>
                  <div className='space-y-1 text-sm'>
                    {achievements
                      .sort(
                        (a, b) => (b.earned_count || 0) - (a.earned_count || 0)
                      )
                      .slice(0, 3)
                      .map((achievement) => (
                        <div
                          key={achievement.id}
                          className='flex justify-between'>
                          <span className='text-gray-600 dark:text-slate-400 truncate'>
                            {achievement.name}:
                          </span>
                          <span className='font-medium text-gray-900 dark:text-slate-100 ml-2'>
                            {achievement.earned_count || 0}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
                  Top Performers
                </h3>
              </div>

              {userStats.length > 0 ? (
                <div className='space-y-3'>
                  {userStats.slice(0, 10).map((user, index) => (
                    <div
                      key={user.id}
                      className='flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg'>
                      <div className='flex items-center space-x-3'>
                        <div className='flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold'>
                          {index + 1}
                        </div>
                        <div>
                          <p className='font-medium text-gray-900 dark:text-slate-100'>
                            {user.profiles?.full_name ||
                              user.profiles?.email ||
                              `User ${user.user_id.slice(0, 8)}...`}
                          </p>
                          <p className='text-sm text-gray-600 dark:text-slate-400'>
                            Level {user.level} • {user.achievements_earned}{' '}
                            achievements
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center space-x-3'>
                        <div className='text-right'>
                          <p className='font-semibold text-gray-900 dark:text-slate-100'>
                            {user.total_points} pts
                          </p>
                          <p className='text-sm text-gray-600 dark:text-slate-400'>
                            {user.current_streak} day streak
                          </p>
                        </div>
                        <button
                          onClick={() => openUserModal(user)}
                          className='p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'>
                          <Edit className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8'>
                  <Users className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                  <p className='text-gray-600 dark:text-slate-400'>
                    No user data available yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className='space-y-6'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
                  Achievement Management ({achievements.length} total)
                </h3>
                <button className='flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'>
                  <Plus className='w-4 h-4' />
                  <span>Add Achievement</span>
                </button>
              </div>

              {/* Filters */}
              <div className='flex flex-wrap gap-4'>
                <div className='flex items-center space-x-2'>
                  <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                    Category:
                  </label>
                  <select
                    value={achievementFilter}
                    onChange={(e) => setAchievementFilter(e.target.value)}
                    className='px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100'>
                    <option value='all'>All Categories</option>
                    <option value='tracking'>Tracking</option>
                    <option value='consistency'>Consistency</option>
                    <option value='milestone'>Milestone</option>
                    <option value='special'>Special</option>
                    <option value='organization'>Organization</option>
                    <option value='analytics'>Analytics</option>
                    <option value='meta'>Meta</option>
                    <option value='mystery'>Mystery</option>
                    <option value='media'>Media</option>
                    <option value='detail'>Detail</option>
                  </select>
                </div>
                <div className='flex items-center space-x-2'>
                  <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                    Status:
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className='px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100'>
                    <option value='all'>All Status</option>
                    <option value='active'>Active Only</option>
                    <option value='inactive'>Inactive Only</option>
                  </select>
                </div>
              </div>

              {/* Filter Stats */}
              {(achievementFilter !== 'all' || statusFilter !== 'all') && (
                <div className='text-sm text-gray-600 dark:text-slate-400'>
                  Showing{' '}
                  {
                    achievements.filter((achievement) => {
                      if (
                        achievementFilter !== 'all' &&
                        achievement.category !== achievementFilter
                      )
                        return false;
                      if (statusFilter === 'active' && !achievement.is_active)
                        return false;
                      if (statusFilter === 'inactive' && achievement.is_active)
                        return false;
                      return true;
                    }).length
                  }{' '}
                  of {achievements.length} achievements
                </div>
              )}

              {achievements.length > 0 ? (
                <div className='space-y-4'>
                  {achievements
                    .filter((achievement) => {
                      if (
                        achievementFilter !== 'all' &&
                        achievement.category !== achievementFilter
                      )
                        return false;
                      if (statusFilter === 'active' && !achievement.is_active)
                        return false;
                      if (statusFilter === 'inactive' && achievement.is_active)
                        return false;
                      return true;
                    })
                    .map((achievement) => (
                      <div
                        key={achievement.id}
                        className='flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg'>
                        <div className='flex items-center space-x-4'>
                          <div
                            className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                              achievement.badge_color === 'gold'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30'
                                : achievement.badge_color === 'silver'
                                ? 'bg-gray-100 dark:bg-gray-900/30'
                                : achievement.badge_color === 'bronze'
                                ? 'bg-orange-100 dark:bg-orange-900/30'
                                : achievement.badge_color === 'platinum'
                                ? 'bg-purple-100 dark:bg-purple-900/30'
                                : achievement.badge_color === 'purple'
                                ? 'bg-purple-100 dark:bg-purple-900/30'
                                : achievement.badge_color === 'green'
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : achievement.badge_color === 'amber'
                                ? 'bg-amber-100 dark:bg-amber-900/30'
                                : achievement.badge_color === 'orange'
                                ? 'bg-orange-100 dark:bg-orange-900/30'
                                : 'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                            <span className='text-xl'>{achievement.icon}</span>
                          </div>
                          <div>
                            <div className='flex items-center space-x-2'>
                              <h4 className='font-semibold text-gray-900 dark:text-slate-100'>
                                {achievement.name}
                              </h4>
                              {achievement.is_active ? (
                                <CheckCircle className='w-4 h-4 text-green-500' />
                              ) : (
                                <AlertCircle className='w-4 h-4 text-red-500' />
                              )}
                            </div>
                            <p className='text-sm text-gray-600 dark:text-slate-400'>
                              {achievement.description}
                            </p>
                            <div className='flex items-center space-x-4 mt-1'>
                              <span className='text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded'>
                                {achievement.points} pts
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  achievement.badge_color === 'gold'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                    : achievement.badge_color === 'silver'
                                    ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                                    : achievement.badge_color === 'bronze'
                                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                    : achievement.badge_color === 'platinum'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}>
                                {achievement.category} •{' '}
                                {achievement.badge_color}
                              </span>
                              <span className='text-xs text-gray-500 dark:text-slate-400'>
                                Earned by {achievement.earned_count || 0} users
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={() =>
                              handleToggleAchievement(
                                achievement.id,
                                achievement.is_active
                              )
                            }
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                              achievement.is_active
                                ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400'
                                : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400'
                            }`}>
                            {achievement.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors'>
                            <Edit className='w-4 h-4' />
                          </button>
                          <button className='p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors'>
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className='text-center py-8'>
                  <Award className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                  <p className='text-gray-600 dark:text-slate-400'>
                    No achievements found.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className='space-y-6'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
                  User Statistics
                </h3>
              </div>

              {userStats.length > 0 ? (
                <div className='overflow-x-auto'>
                  <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider'>
                          User
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider'>
                          Level
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider'>
                          Points
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider'>
                          Streak
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider'>
                          Achievements
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider'>
                          Sensors
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider'>
                          Account Age
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700'>
                      {userStats.map((user) => (
                        <tr key={user.id}>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div>
                              <div className='text-sm font-medium text-gray-900 dark:text-slate-100'>
                                {user.profiles?.full_name ||
                                  user.profiles?.email ||
                                  `User ${user.user_id.slice(0, 8)}...`}
                              </div>
                              <div className='text-sm text-gray-500 dark:text-slate-400'>
                                {user.profiles?.email}
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100'>
                            {user.level}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100'>
                            {user.total_points}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100'>
                            {user.current_streak} / {user.longest_streak}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100'>
                            {user.achievements_earned}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100'>
                            {user.sensors_tracked} / {user.sensors_total}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100'>
                            {user.account_age_days} days
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm'>
                            <button
                              onClick={() => openUserModal(user)}
                              className='flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded transition-colors'>
                              <UserPlus className='w-4 h-4' />
                              <span>Manage</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='text-center py-8'>
                  <Users className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                  <p className='text-gray-600 dark:text-slate-400'>
                    No user statistics available yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feature Preview */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6'>
          <div className='flex items-center mb-4'>
            <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
              <Award className='w-6 h-6 text-blue-600 dark:text-blue-400' />
            </div>
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2'>
            Achievement System
          </h3>
          <p className='text-sm text-gray-600 dark:text-slate-400'>
            Create custom achievements with points, categories, and
            requirements.
          </p>
        </div>

        <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6'>
          <div className='flex items-center mb-4'>
            <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-lg'>
              <Users className='w-6 h-6 text-green-600 dark:text-green-400' />
            </div>
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2'>
            User Progress
          </h3>
          <p className='text-sm text-gray-600 dark:text-slate-400'>
            Track user levels, points, streaks, and achievement progress.
          </p>
        </div>

        <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6'>
          <div className='flex items-center mb-4'>
            <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
              <BarChart3 className='w-6 h-6 text-purple-600 dark:text-purple-400' />
            </div>
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2'>
            Analytics
          </h3>
          <p className='text-sm text-gray-600 dark:text-slate-400'>
            View detailed statistics and engagement metrics.
          </p>
        </div>
      </div>

      {/* User Achievement Management Modal */}
      {showUserModal && selectedUser && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden'>
            {/* Modal Header */}
            <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700'>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 dark:text-slate-100'>
                  Manage Achievements
                </h2>
                <p className='text-sm text-gray-600 dark:text-slate-400'>
                  {selectedUser.profiles?.full_name ||
                    selectedUser.profiles?.email ||
                    `User ${selectedUser.user_id.slice(0, 8)}...`}
                </p>
              </div>
              <button
                onClick={closeUserModal}
                className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors'>
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Modal Content */}
            <div className='p-6 overflow-y-auto max-h-[calc(90vh-120px)]'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                {/* User's Current Achievements */}
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4'>
                    Current Achievements ({userAchievements.length})
                  </h3>

                  {loadingUserAchievements ? (
                    <div className='flex items-center justify-center py-8'>
                      <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
                      <span className='ml-2 text-gray-600 dark:text-slate-400'>
                        Loading...
                      </span>
                    </div>
                  ) : userAchievements.length > 0 ? (
                    <div className='space-y-3 max-h-96 overflow-y-auto'>
                      {userAchievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          className='flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg'>
                          <div className='flex items-center space-x-3'>
                            <span className='text-lg'>{achievement.icon}</span>
                            <div>
                              <p className='font-medium text-gray-900 dark:text-slate-100'>
                                {achievement.name}
                              </p>
                              <p className='text-xs text-gray-500 dark:text-slate-400'>
                                {achievement.points} pts • Earned{' '}
                                {new Date(
                                  achievement.earned_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveAchievement(achievement.id)
                            }
                            className='p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors'>
                            <UserMinus className='w-4 h-4' />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-8'>
                      <Award className='w-12 h-12 text-gray-400 mx-auto mb-2' />
                      <p className='text-gray-600 dark:text-slate-400'>
                        No achievements yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Available Achievements to Award */}
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4'>
                    Award Achievement
                  </h3>

                  <div className='space-y-3 max-h-96 overflow-y-auto'>
                    {achievements
                      .filter(
                        (achievement) =>
                          achievement.is_active &&
                          !userAchievements.some(
                            (ua) => ua.id === achievement.id
                          )
                      )
                      .map((achievement) => (
                        <div
                          key={achievement.id}
                          className='flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg'>
                          <div className='flex items-center space-x-3'>
                            <span className='text-lg'>{achievement.icon}</span>
                            <div>
                              <p className='font-medium text-gray-900 dark:text-slate-100'>
                                {achievement.name}
                              </p>
                              <p className='text-xs text-gray-500 dark:text-slate-400'>
                                {achievement.points} pts •{' '}
                                {achievement.category}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleAwardAchievement(achievement.id)
                            }
                            className='p-1 text-green-400 hover:text-green-600 dark:hover:text-green-300 transition-colors'>
                            <UserPlus className='w-4 h-4' />
                          </button>
                        </div>
                      ))}
                  </div>

                  {achievements.filter(
                    (achievement) =>
                      achievement.is_active &&
                      !userAchievements.some((ua) => ua.id === achievement.id)
                  ).length === 0 && (
                    <div className='text-center py-8'>
                      <CheckCircle className='w-12 h-12 text-green-400 mx-auto mb-2' />
                      <p className='text-gray-600 dark:text-slate-400'>
                        User has all available achievements!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
