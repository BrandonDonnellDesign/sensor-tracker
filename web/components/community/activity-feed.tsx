'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  ThumbsUp, 
  MessageCircle, 
  Bookmark, 
  Plus, 
  Users,
  Star,
  Award,
  Zap
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';
// import { useAuth } from '@/components/providers/auth-provider'; // Not currently used

interface ActivityItem {
  id: string;
  type: 'tip_created' | 'tip_liked' | 'comment_added' | 'tip_bookmarked' | 'tip_featured' | 'user_joined' | 'milestone_reached';
  title: string;
  description: string;
  actor: string;
  actorId?: string;
  targetId?: string;
  targetType?: 'tip' | 'comment' | 'user';
  createdAt: string;
  metadata?: {
    tipTitle?: string;
    commentContent?: string;
    category?: string;
    milestone?: string;
    count?: number;
  };
}

interface ActivityFeedProps {
  className?: string;
  limit?: number;
  showHeader?: boolean;
}

export function ActivityFeed({ className = '', limit = 10, showHeader = true }: ActivityFeedProps) {
  // const { user } = useAuth(); // Not currently used
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tips' | 'comments' | 'votes'>('all');

  useEffect(() => {
    fetchActivities();
    // Set up polling for real-time updates
    const interval = setInterval(fetchActivities, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [filter, limit]);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams({
        filter,
        limit: limit.toString()
      });
      
      const response = await authenticatedFetch(`/api/community/activity?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tip_created':
        return <Plus className="w-4 h-4 text-blue-500" />;
      case 'tip_liked':
        return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'comment_added':
        return <MessageCircle className="w-4 h-4 text-purple-500" />;
      case 'tip_bookmarked':
        return <Bookmark className="w-4 h-4 text-yellow-500" />;
      case 'tip_featured':
        return <Star className="w-4 h-4 text-orange-500" />;
      case 'user_joined':
        return <Users className="w-4 h-4 text-indigo-500" />;
      case 'milestone_reached':
        return <Award className="w-4 h-4 text-pink-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'tip_created':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      case 'tip_liked':
        return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'comment_added':
        return 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800';
      case 'tip_bookmarked':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'tip_featured':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
      case 'user_joined':
        return 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800';
      case 'milestone_reached':
        return 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleActivityClick = (activity: ActivityItem) => {
    // Navigate to the related content
    if (activity.targetType === 'tip' && activity.targetId) {
      // Navigate to tip detail or scroll to tip
      window.location.hash = `tip-${activity.targetId}`;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${className}`}>
        {showHeader && (
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
          </div>
        )}
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${className}`}>
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                Community Activity
              </h3>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span className="text-xs text-gray-500 dark:text-slate-400">Live</span>
            </div>
          </div>
          
          {/* Activity Filters */}
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All', icon: Activity },
              { key: 'tips', label: 'Tips', icon: Plus },
              { key: 'comments', label: 'Comments', icon: MessageCircle },
              { key: 'votes', label: 'Votes', icon: ThumbsUp }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 border border-transparent'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-slate-400 text-sm">
              No recent activity
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer ${getActivityColor(activity.type)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-current">
                    {getActivityIcon(activity.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {activity.title}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex-shrink-0 ml-2">
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {activity.description}
                  </p>
                  
                  {/* Activity Metadata */}
                  {activity.metadata && (
                    <div className="flex items-center space-x-3 mt-2">
                      {activity.metadata.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border">
                          {activity.metadata.category}
                        </span>
                      )}
                      {activity.metadata.count && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          {activity.metadata.count} interactions
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* View More Button */}
        {activities.length >= limit && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                // Navigate to full activity page or load more
                console.log('Load more activities');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              View more activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}