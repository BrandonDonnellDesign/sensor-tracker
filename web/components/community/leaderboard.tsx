'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Star, 
  TrendingUp, 
  Users, 
  ThumbsUp, 
  MessageCircle, 
  Lightbulb,
  Crown,
  Award,
  Zap
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';
// import { useAuth } from '@/components/providers/auth-provider'; // Not currently used

interface LeaderboardUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  rank: number;
  score: number;
  stats: {
    tipsCreated: number;
    totalLikes: number;
    commentsPosted: number;
    helpfulVotes: number;
    streakDays: number;
  };
  badges: string[];
  level: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  className?: string;
  period?: 'week' | 'month' | 'all';
  category?: 'overall' | 'tips' | 'helpful' | 'active';
  limit?: number;
}

export function Leaderboard({ 
  className = '', 
  period = 'month', 
  category = 'overall',
  limit = 10 
}: LeaderboardProps) {
  // const { user } = useAuth(); // Not currently used
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedCategory, setSelectedCategory] = useState(category);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedPeriod, selectedCategory, limit]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        category: selectedCategory,
        limit: limit.toString()
      });
      
      const response = await authenticatedFetch(`/api/community/leaderboard?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-slate-400">
            {rank}
          </div>
        );
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default:
        return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300';
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'helpful':
        return <ThumbsUp className="w-3 h-3" />;
      case 'prolific':
        return <Lightbulb className="w-3 h-3" />;
      case 'social':
        return <MessageCircle className="w-3 h-3" />;
      case 'streak':
        return <Zap className="w-3 h-3" />;
      case 'expert':
        return <Star className="w-3 h-3" />;
      default:
        return <Award className="w-3 h-3" />;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'helpful':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'prolific':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'social':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'streak':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'expert':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return 'text-purple-600 dark:text-purple-400';
    if (level >= 5) return 'text-blue-600 dark:text-blue-400';
    if (level >= 3) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-slate-400';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
              <div className="w-12 h-6 bg-gray-200 dark:bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">
              Leaderboard
            </h3>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {selectedPeriod === 'week' ? 'This Week' : selectedPeriod === 'month' ? 'This Month' : 'All Time'}
            </span>
          </div>
        </div>
        
        {/* Filters */}
        <div className="space-y-2">
          {/* Period Filter */}
          <div className="flex space-x-2">
            {[
              { key: 'week', label: 'Week' },
              { key: 'month', label: 'Month' },
              { key: 'all', label: 'All Time' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedPeriod(key as any)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  selectedPeriod === key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          {/* Category Filter */}
          <div className="flex space-x-2">
            {[
              { key: 'overall', label: 'Overall', icon: Trophy },
              { key: 'tips', label: 'Tips', icon: Lightbulb },
              { key: 'helpful', label: 'Helpful', icon: ThumbsUp },
              { key: 'active', label: 'Active', icon: Users }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as any)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  selectedCategory === key
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 border border-transparent'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="p-4">
        {leaderboard.length === 0 ? (
          <div className="text-center py-6">
            <Trophy className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-slate-400 text-sm">
              No rankings available yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((userEntry) => (
              <div
                key={userEntry.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                  userEntry.isCurrentUser
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700'
                } ${userEntry.rank <= 3 ? 'ring-2 ring-opacity-50' : ''} ${
                  userEntry.rank === 1 ? 'ring-yellow-300' : 
                  userEntry.rank === 2 ? 'ring-gray-300' : 
                  userEntry.rank === 3 ? 'ring-amber-300' : ''
                }`}
              >
                {/* Rank */}
                <div className="flex-shrink-0">
                  {getRankIcon(userEntry.rank)}
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {userEntry.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                          {userEntry.displayName || userEntry.username}
                          {userEntry.isCurrentUser && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(You)</span>
                          )}
                        </p>
                        <span className={`text-xs font-bold ${getLevelColor(userEntry.level)}`}>
                          L{userEntry.level}
                        </span>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center space-x-3 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-slate-400">
                          <Lightbulb className="w-3 h-3" />
                          <span>{userEntry.stats.tipsCreated}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-slate-400">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{userEntry.stats.totalLikes}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-slate-400">
                          <MessageCircle className="w-3 h-3" />
                          <span>{userEntry.stats.commentsPosted}</span>
                        </div>
                        {userEntry.stats.streakDays > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                            <Zap className="w-3 h-3" />
                            <span>{userEntry.stats.streakDays}d</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Badges */}
                  {userEntry.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {userEntry.badges.slice(0, 3).map((badge, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(badge)}`}
                        >
                          {getBadgeIcon(badge)}
                          <span className="capitalize">{badge}</span>
                        </span>
                      ))}
                      {userEntry.badges.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          +{userEntry.badges.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getRankColor(userEntry.rank)}`}>
                    {userEntry.score.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    points
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* View Full Leaderboard */}
        {leaderboard.length >= limit && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                // Navigate to full leaderboard page
                console.log('View full leaderboard');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              View full leaderboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}