'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch, authenticatedFetchJson } from '@/lib/api-client';
import { useAuth } from '@/components/providers/auth-provider';
import { 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown,
  Reply,
  Send,
  Trash2,
  User
} from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  author: string;
  authorId: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  userVote: 'up' | 'down' | null;
  replies: Comment[];
  parentCommentId?: string;
}

interface TipCommentsProps {
  tipId: string;
  initialCommentCount?: number;
  className?: string;
}

export function TipComments({ tipId, className = '' }: TipCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votingComments, setVotingComments] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [deletingComments, setDeletingComments] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (tipId) {
      fetchComments();
    }
  }, [tipId]);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const response = await authenticatedFetch('/api/profile');
          if (response.ok) {
            const profile = await response.json();
            setIsAdmin(profile.role === 'admin');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await authenticatedFetchJson(`/api/community/tips/${tipId}/comments`);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const result = await authenticatedFetchJson(`/api/community/tips/${tipId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: newComment.trim()
        }),
      });
      
      // Add the new comment to the list
      setComments(prev => [result.comment, ...prev]);
      setNewComment('');
      setShowCommentForm(false);

    } catch (error) {
      console.error('Error posting comment:', error);
      // You could show a toast notification here
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, parentCommentId: string) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const result = await authenticatedFetchJson(`/api/community/tips/${tipId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyContent.trim(),
          parentCommentId
        }),
      });
      
      // Add the reply to the parent comment
      setComments(prev => prev.map(comment => {
        if (comment.id === parentCommentId) {
          return {
            ...comment,
            replies: [...comment.replies, result.comment],
            replyCount: comment.replyCount + 1
          };
        }
        return comment;
      }));
      
      setReplyContent('');
      setReplyingTo(null);

    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteComment = async (commentId: string, voteType: 'up' | 'down') => {
    if (votingComments.has(commentId)) return;
    
    setVotingComments(prev => new Set(prev).add(commentId));
    
    try {
      const result = await authenticatedFetchJson(`/api/community/comments/${commentId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ voteType }),
      });
      
      // Update comment vote counts
      const updateComment = (comment: Comment): Comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            upvotes: result.updatedCounts.upvotes,
            downvotes: result.updatedCounts.downvotes,
            netVotes: result.updatedCounts.netVotes,
            userVote: result.voteResult.vote_type
          };
        }
        
        // Also check replies
        return {
          ...comment,
          replies: comment.replies.map(updateComment)
        };
      };

      setComments(prev => prev.map(updateComment));

    } catch (error) {
      console.error('Error voting on comment:', error);
    } finally {
      setVotingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleAdminDeleteComment = async (commentId: string) => {
    if (!isAdmin || deletingComments.has(commentId)) return;

    const confirmed = window.confirm('Are you sure you want to delete this comment? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingComments(prev => new Set(prev).add(commentId));

    try {
      const response = await authenticatedFetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Remove comment from local state
      const removeComment = (comments: Comment[]): Comment[] => {
        return comments.filter(comment => {
          if (comment.id === commentId) {
            return false;
          }
          // Also remove from replies
          comment.replies = removeComment(comment.replies);
          return true;
        });
      };

      setComments(prev => removeComment(prev));

    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setDeletingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-3' : 'mb-4'}`}>
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {comment.author}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => handleAdminDeleteComment(comment.id)}
              disabled={deletingComments.has(comment.id)}
              className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete comment (Admin)"
            >
              {deletingComments.has(comment.id) ? (
                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Comment Content */}
        <p className="text-gray-700 dark:text-slate-300 mb-3 text-sm leading-relaxed">
          {comment.content}
        </p>

        {/* Comment Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Upvote */}
            <button
              onClick={() => handleVoteComment(comment.id, 'up')}
              disabled={votingComments.has(comment.id)}
              className={`flex items-center space-x-1 text-xs transition-colors ${
                comment.userVote === 'up'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400'
              } ${votingComments.has(comment.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ThumbsUp className={`w-3 h-3 ${comment.userVote === 'up' ? 'fill-current' : ''}`} />
              <span>{comment.upvotes}</span>
            </button>

            {/* Downvote */}
            <button
              onClick={() => handleVoteComment(comment.id, 'down')}
              disabled={votingComments.has(comment.id)}
              className={`flex items-center space-x-1 text-xs transition-colors ${
                comment.userVote === 'down'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400'
              } ${votingComments.has(comment.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ThumbsDown className={`w-3 h-3 ${comment.userVote === 'down' ? 'fill-current' : ''}`} />
              <span>{comment.downvotes}</span>
            </button>

            {/* Net Score */}
            {comment.netVotes !== 0 && (
              <div className={`text-xs font-medium ${
                comment.netVotes > 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {comment.netVotes > 0 ? '+' : ''}{comment.netVotes}
              </div>
            )}

            {/* Reply Button (only for top-level comments) */}
            {!isReply && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="flex items-center space-x-1 text-xs text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Reply className="w-3 h-3" />
                <span>Reply</span>
              </button>
            )}
          </div>

          {/* Show Replies Button */}
          {!isReply && comment.replyCount > 0 && (
            <button
              onClick={() => toggleReplies(comment.id)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {expandedComments.has(comment.id) ? 'Hide' : 'Show'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {/* Reply Form */}
        {replyingTo === comment.id && (
          <form onSubmit={(e) => handleSubmitReply(e, comment.id)} className="mt-3">
            <div className="flex space-x-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!replyContent.trim() || submitting}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Replies */}
      {!isReply && expandedComments.has(comment.id) && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Comments ({comments.length})
            </h3>
          </div>
          
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Add Comment
          </button>
        </div>

        {/* Comment Form */}
        {showCommentForm && (
          <form onSubmit={handleSubmitComment} className="mt-4">
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this tip..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {newComment.length}/1000 characters
                </span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommentForm(false);
                      setNewComment('');
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      <div className="p-6">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  );
}