'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  Trash2, 
  Eye,
  Users,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';

interface CommunityStats {
  totalTips: number;
  totalComments: number;
  totalVotes: number;
  totalReports: number;
  activeUsers: number;
  recentActivity: number;
}

interface RecentTip {
  id: string;
  title: string;
  author: string;
  category: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  createdAt: string;
  isVerified: boolean;
}

interface RecentComment {
  id: string;
  content: string;
  author: string;
  tipTitle: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  isApproved?: boolean;
  isRejected?: boolean;
  moderatedAt?: string;
}

interface AuditLogEntry {
  id: string;
  adminEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: any;
  createdAt: string;
}

interface FlaggedContent {
  id: string;
  type: 'tip' | 'comment';
  title?: string;
  content: string;
  category?: string;
  tipTitle?: string;
  author: string;
  moderationReason: string;
  moderatedAt: string;
  createdAt: string;
}

export function CommunityModerationDashboard() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [recentTips, setRecentTips] = useState<RecentTip[]>([]);
  const [recentComments, setRecentComments] = useState<RecentComment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [aiModerationStats, setAiModerationStats] = useState<any>(null);
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tips' | 'comments' | 'ai-moderation' | 'audit'>('overview');

  useEffect(() => {
    fetchCommunityData();
  }, []);

  // Fetch flagged content when AI moderation tab is selected
  useEffect(() => {
    if (activeTab === 'ai-moderation') {
      fetchFlaggedContent();
    }
  }, [activeTab]);

  const fetchFlaggedContent = async () => {
    try {
      const flaggedResponse = await authenticatedFetch('/api/admin/ai-moderation/flagged-content');
      if (flaggedResponse.ok) {
        const flaggedData = await flaggedResponse.json();
        setFlaggedContent(flaggedData.flaggedContent || []);
      }
    } catch (error) {
      console.error('Error fetching flagged content:', error);
    }
  };

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      // Fetch community stats
      const statsResponse = await authenticatedFetch('/api/admin/community/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent tips
      const tipsResponse = await authenticatedFetch('/api/admin/community/recent-tips');
      if (tipsResponse.ok) {
        const tipsData = await tipsResponse.json();
        setRecentTips(tipsData.tips || []);
      }

      // Fetch recent comments
      const commentsResponse = await authenticatedFetch('/api/admin/community/recent-comments');
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setRecentComments(commentsData.comments || []);
      }

      // Fetch audit logs
      const auditResponse = await authenticatedFetch('/api/admin/community/audit-logs');
      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setAuditLogs(auditData.logs || []);
      }

      // Fetch AI moderation stats
      const aiStatsResponse = await authenticatedFetch('/api/admin/ai-moderation/stats');
      if (aiStatsResponse.ok) {
        const aiStatsData = await aiStatsResponse.json();
        setAiModerationStats(aiStatsData);
      }

      // Fetch flagged content for review
      console.log('🔄 Fetching flagged content...');
      const flaggedResponse = await authenticatedFetch('/api/admin/ai-moderation/flagged-content');
      console.log('🔄 Flagged response status:', flaggedResponse.status);
      if (flaggedResponse.ok) {
        const flaggedData = await flaggedResponse.json();
        console.log('🔍 Flagged Content API Response:', flaggedData);
        console.log('🔍 Flagged Content Array:', flaggedData.flaggedContent);
        console.log('� Flalgged Content Length:', flaggedData.flaggedContent?.length);
        setFlaggedContent(flaggedData.flaggedContent || []);
        console.log('� F lagged Content Set to State:', flaggedData.flaggedContent || []);
      } else {
        console.error('🚨 Flagged Content API Error:', flaggedResponse.status, flaggedResponse.statusText);
        const errorData = await flaggedResponse.json().catch(() => ({}));
        console.error('🚨 Error Details:', errorData);
      }

    } catch (error) {
      console.error('Error fetching community data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTip = async (tipId: string) => {
    if (!confirm('Are you sure you want to delete this tip? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/admin/community/tips/${tipId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh data
        fetchCommunityData();
      } else {
        alert('Failed to delete tip');
      }
    } catch (error) {
      console.error('Error deleting tip:', error);
      alert('Error deleting tip');
    }
  };

  const handleVerifyTip = async (tipId: string, verified: boolean) => {
    try {
      const response = await authenticatedFetch(`/api/admin/community/tips/${tipId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified }),
      });

      if (response.ok) {
        // Update local state
        setRecentTips(prev => prev.map(tip => 
          tip.id === tipId ? { ...tip, isVerified: verified } : tip
        ));
      } else {
        alert('Failed to update tip verification');
      }
    } catch (error) {
      console.error('Error updating tip verification:', error);
      alert('Error updating tip verification');
    }
  };

  const handleApproveComment = async (commentId: string) => {
    try {
      const response = await authenticatedFetch(`/api/admin/comments/${commentId}/approve`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Refresh comments
        fetchCommunityData();
      } else {
        alert('Failed to approve comment');
      }
    } catch (error) {
      console.error('Error approving comment:', error);
      alert('Error approving comment');
    }
  };

  const handleRejectComment = async (commentId: string) => {
    try {
      const response = await authenticatedFetch(`/api/admin/comments/${commentId}/reject`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Refresh comments
        fetchCommunityData();
      } else {
        alert('Failed to reject comment');
      }
    } catch (error) {
      console.error('Error rejecting comment:', error);
      alert('Error rejecting comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh comments
        fetchCommunityData();
      } else {
        alert('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment');
    }
  };



  const handleReviewContent = async (contentId: string, contentType: 'tip' | 'comment', action: 'approve' | 'reject', adminNotes?: string) => {
    console.log('🔄 Starting review:', { contentId, contentType, action });
    setReviewLoading(contentId);
    
    try {
      const response = await authenticatedFetch('/api/admin/ai-moderation/review', {
        method: 'POST',
        body: JSON.stringify({
          contentId,
          contentType,
          action,
          adminNotes
        }),
      });

      console.log('🔄 Review response:', { status: response.status, ok: response.ok });

      if (response.ok) {
        // Remove the reviewed content from the flagged list
        setFlaggedContent(prev => prev.filter(item => item.id !== contentId));
        
        // Refresh stats and flagged content
        const aiStatsResponse = await authenticatedFetch('/api/admin/ai-moderation/stats');
        if (aiStatsResponse.ok) {
          const aiStatsData = await aiStatsResponse.json();
          setAiModerationStats(aiStatsData);
        }
        
        // Refresh flagged content
        await fetchFlaggedContent();
      } else {
        const errorData = await response.json();
        console.error('🚨 Review API error:', errorData);
        alert(`Failed to ${action} ${contentType}: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing ${contentType}:`, error);
      alert(`Error ${action}ing ${contentType}`);
    } finally {
      setReviewLoading(null);
    }
  };





  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Tips</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stats?.totalTips || 0}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Comments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stats?.totalComments || 0}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stats?.totalVotes || 0}
              </p>
            </div>
            <ThumbsUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stats?.activeUsers || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Reports</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stats?.totalReports || 0}
              </p>
            </div>
            <Flag className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Recent Activity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stats?.recentActivity || 0}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Eye },
            { id: 'tips', name: 'Recent Tips', icon: MessageSquare },
            { id: 'comments', name: 'Recent Comments', icon: MessageSquare },
            { id: 'ai-moderation', name: 'AI Moderation', icon: Users },
            { id: 'audit', name: 'Audit Logs', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentTips.slice(0, 3).map((tip) => (
                  <div key={tip.id} className="flex items-start space-x-3">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-slate-100 font-medium">{tip.title}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400">by {tip.author} • {formatTimeAgo(tip.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {recentComments.slice(0, 2).map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-slate-100">{comment.content.substring(0, 60)}...</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400">on "{comment.tipTitle}" • {formatTimeAgo(comment.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('tips')}
                  className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">Manage Tips</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Review and moderate tips</p>
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">Manage Comments</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Review and moderate comments</p>
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">Audit Logs</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">View admin actions</p>
                </button>
                <button
                  onClick={fetchCommunityData}
                  className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">Refresh Data</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Update statistics</p>
                </button>


              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tips' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Tips</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {recentTips.map((tip) => (
              <div key={tip.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-slate-100">{tip.title}</h4>
                      {tip.isVerified && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-xs font-medium rounded-full">
                        {tip.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                      by {tip.author} • {formatTimeAgo(tip.createdAt)}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{tip.upvotes}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <ThumbsDown className="w-4 h-4" />
                        <span>{tip.downvotes}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{tip.comments}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleVerifyTip(tip.id, !tip.isVerified)}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        tip.isVerified
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tip.isVerified ? 'Verified' : 'Verify'}
                    </button>
                    <button
                      onClick={() => handleDeleteTip(tip.id)}
                      className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Comments</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {recentComments.map((comment) => (
              <div key={comment.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-2 mb-2">
                      <p className="text-gray-900 dark:text-slate-100 flex-1">{comment.content}</p>
                      {comment.isApproved === true && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs font-medium rounded-full">
                          Approved
                        </span>
                      )}
                      {comment.isRejected === true && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs font-medium rounded-full">
                          Rejected
                        </span>
                      )}
                      {comment.isApproved === null && comment.isRejected === false && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs font-medium rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                      by {comment.author} on "{comment.tipTitle}" • {formatTimeAgo(comment.createdAt)}
                      {comment.moderatedAt && (
                        <span> • Moderated {formatTimeAgo(comment.moderatedAt)}</span>
                      )}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{comment.upvotes}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <ThumbsDown className="w-4 h-4" />
                        <span>{comment.downvotes}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {comment.isApproved !== true && (
                      <button
                        onClick={() => handleApproveComment(comment.id)}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                      >
                        Approve
                      </button>
                    )}
                    {comment.isRejected !== true && (
                      <button
                        onClick={() => handleRejectComment(comment.id)}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/30"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ai-moderation' && (
        <div className="space-y-6">
          {/* AI Moderation Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Moderated</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {aiModerationStats?.total_moderated || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Auto-Approved</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {aiModerationStats?.approved || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Flagged for Review</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {aiModerationStats?.flagged || 0}
                  </p>
                </div>
                <Flag className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Auto-Rejected</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {aiModerationStats?.rejected || 0}
                  </p>
                </div>
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Detection Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Detection Statistics</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {aiModerationStats?.detectionStats?.spam || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Spam Detected</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {aiModerationStats?.detectionStats?.inappropriate || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Inappropriate Content</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {aiModerationStats?.detectionStats?.offTopic || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Off-Topic</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {aiModerationStats?.detectionStats?.misinformation || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Medical Misinformation</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">AI Performance</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Average Confidence</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">
                      {aiModerationStats?.avg_confidence || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Average Quality Score</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">
                      {aiModerationStats?.avg_quality || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Auto-Approval Rate</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {aiModerationStats?.total_moderated > 0 
                        ? Math.round((aiModerationStats.approved / aiModerationStats.total_moderated) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Content Breakdown</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Tips Moderated</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {aiModerationStats?.by_content_type?.tips || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Comments Moderated</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {aiModerationStats?.by_content_type?.comments || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Manual Review Needed</span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {(aiModerationStats?.flagged || 0) + (aiModerationStats?.rejected || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Review Queue */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Content Review Queue
                </h3>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-sm font-medium rounded-full">
                  {flaggedContent.length} items pending
                </span>
              </div>
            </div>
            
            {flaggedContent.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                  All Clear!
                </h4>
                <p className="text-gray-600 dark:text-slate-400">
                  No content is currently flagged for review.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {flaggedContent.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item.type === 'tip' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {item.type.toUpperCase()}
                          </span>
                          {(item as any).isDeleted && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs font-medium rounded-full">
                              DELETED
                            </span>
                          )}
                          {item.category && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-xs font-medium rounded-full">
                              {item.category}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            Flagged {formatTimeAgo(item.moderatedAt)}
                          </span>
                        </div>
                        
                        {item.title && (
                          <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-1">
                            {item.title}
                          </h4>
                        )}
                        
                        <p className="text-gray-700 dark:text-slate-300 mb-2">
                          {item.content.length > 200 
                            ? `${item.content.substring(0, 200)}...` 
                            : item.content
                          }
                        </p>
                        
                        {item.tipTitle && (
                          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                            Comment on: "{item.tipTitle}"
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-slate-400 mb-3">
                          <span>by {item.author}</span>
                          <span>•</span>
                          <span>Created {formatTimeAgo(item.createdAt)}</span>
                        </div>
                        
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <Flag className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                AI Moderation Flag
                              </p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                {item.moderationReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-6">
                        <button
                          onClick={() => handleReviewContent(item.id, item.type, 'approve')}
                          disabled={reviewLoading === item.id}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors"
                        >
                          {reviewLoading === item.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReviewContent(item.id, item.type, 'reject')}
                          disabled={reviewLoading === item.id}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors"
                        >
                          {reviewLoading === item.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Admin Audit Logs</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs font-medium rounded-full">
                        {log.action}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-slate-400">
                        {log.resourceType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                      by {log.adminEmail} • {formatTimeAgo(log.createdAt)}
                    </p>
                    {log.details && (
                      <div className="text-xs text-gray-500 dark:text-slate-500 bg-gray-50 dark:bg-slate-700/50 p-2 rounded">
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}