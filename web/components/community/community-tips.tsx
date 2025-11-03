'use client';

import { useState, useEffect, useRef } from 'react';
import { TipComments } from './tip-comments';
import { AddTipModal } from './add-tip-modal';
import { authenticatedFetch, authenticatedFetchJson } from '@/lib/api-client';
import { 
  Lightbulb, 
  ThumbsUp, 
  ThumbsDown,
  MessageCircle, 
  Share2,
  Plus,
  Filter,
  TrendingUp,
  Clock,
  User,
  CheckCircle,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

interface CommunityTip {
  id: string;
  title: string;
  content: string;
  category: 'insertion' | 'adhesion' | 'longevity' | 'troubleshooting' | 'general';
  author: string; // Anonymous identifier
  authorId?: string; // Author's user ID for ownership check
  likes: number;
  dislikes: number;
  netVotes: number;
  comments: number;
  createdAt: string; // ISO date string from API
  isVerified: boolean;
  tags: string[];
  userVote: 'up' | 'down' | null; // User's current vote
  isBookmarked: boolean;
}

interface CommunityTipsProps {
  className?: string;
}

export function CommunityTips({ className = '' }: CommunityTipsProps) {
  const { user } = useAuth();
  const [tips, setTips] = useState<CommunityTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('popular');
  const [showAddTip, setShowAddTip] = useState(false);
  const [votingTips, setVotingTips] = useState<Set<string>>(new Set());
  const [bookmarkingTips, setBookmarkingTips] = useState<Set<string>>(new Set());
  const [selectedTip, setSelectedTip] = useState<string | null>(null);
  const [deletingTips, setDeletingTips] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCommunityTips();
  }, [selectedCategory, sortBy]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDeleteConfirm(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCommunityTips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        sortBy: sortBy
      });
      
      const response = await authenticatedFetch(`/api/community/tips?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch community tips');
      }
      
      const data = await response.json();
      setTips(data);
    } catch (error) {
      console.error('Failed to fetch community tips:', error);
      setTips([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'All Tips', icon: Lightbulb },
    { value: 'insertion', label: 'Insertion', icon: Plus },
    { value: 'adhesion', label: 'Adhesion', icon: CheckCircle },
    { value: 'longevity', label: 'Longevity', icon: Clock },
    { value: 'troubleshooting', label: 'Troubleshooting', icon: MessageCircle },
    { value: 'general', label: 'General', icon: User }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'insertion': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'adhesion': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'longevity': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'troubleshooting': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const handleVote = async (tipId: string, voteType: 'up' | 'down') => {
    // Prevent multiple simultaneous votes on the same tip
    if (votingTips.has(tipId)) return;
    
    setVotingTips(prev => new Set(prev).add(tipId));
    
    try {
      const result = await authenticatedFetchJson('/api/community/tips', {
        method: 'POST',
        body: JSON.stringify({
          action: 'vote',
          tipId,
          voteType
        }),
      });
      
      // Update the tip with new vote counts and user's vote status
      setTips(prev => prev.map(tip => {
        if (tip.id === tipId) {
          const newUserVote = result.voteResult.vote_type;
          return {
            ...tip,
            likes: result.updatedCounts.likes,
            dislikes: result.updatedCounts.dislikes,
            netVotes: result.updatedCounts.netVotes,
            userVote: newUserVote
          };
        }
        return tip;
      }));

    } catch (error) {
      console.error('Error voting on tip:', error);
      // You could show a toast notification here
    } finally {
      setVotingTips(prev => {
        const newSet = new Set(prev);
        newSet.delete(tipId);
        return newSet;
      });
    }
  };

  const handleBookmark = async (tipId: string) => {
    if (bookmarkingTips.has(tipId)) return;
    
    setBookmarkingTips(prev => new Set(prev).add(tipId));
    
    try {
      const result = await authenticatedFetchJson(`/api/community/tips/${tipId}/bookmark`, {
        method: 'POST',
      });
      
      // Update bookmark status
      setTips(prev => prev.map(tip => {
        if (tip.id === tipId) {
          return {
            ...tip,
            isBookmarked: result.bookmarkResult.bookmarked
          };
        }
        return tip;
      }));

    } catch (error) {
      console.error('Error bookmarking tip:', error);
    } finally {
      setBookmarkingTips(prev => {
        const newSet = new Set(prev);
        newSet.delete(tipId);
        return newSet;
      });
    }
  };

  const handleViewComments = (tipId: string) => {
    setSelectedTip(selectedTip === tipId ? null : tipId);
  };

  const handleTipAdded = () => {
    // Refresh the tips list when a new tip is added
    fetchCommunityTips();
  };

  const handleDeleteTip = async (tipId: string) => {
    if (deletingTips.has(tipId)) return;
    
    setDeletingTips(prev => new Set(prev).add(tipId));
    
    try {
      await authenticatedFetchJson(`/api/community/tips/${tipId}/delete`, {
        method: 'DELETE',
      });
      
      // Remove the tip from the local state
      setTips(prev => prev.filter(tip => tip.id !== tipId));
      setShowDeleteConfirm(null);

    } catch (error) {
      console.error('Error deleting tip:', error);
      // You could show a toast notification here
    } finally {
      setDeletingTips(prev => {
        const newSet = new Set(prev);
        newSet.delete(tipId);
        return newSet;
      });
    }
  };

  const canDeleteTip = (tip: CommunityTip) => {
    return user && tip.authorId === user.id;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
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
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Community Tips
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Learn from other CGM users' experiences
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddTip(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Share Tip</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <category.icon className="w-4 h-4" />
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="text-sm text-gray-600 dark:text-slate-400">Sort by:</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setSortBy('popular')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                sortBy === 'popular'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Popular
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                sortBy === 'recent'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-1" />
              Recent
            </button>
          </div>
        </div>
      </div>

      {/* Tips List */}
      <div className="p-6 space-y-4">
        {tips.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400">
              No tips found for this category. Be the first to share!
            </p>
          </div>
        ) : (
          tips.map((tip) => (
            <div
              key={tip.id}
              className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {/* Tip Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-slate-100">
                      {tip.title}
                    </h4>
                    {tip.isVerified && (
                      <div title="Verified tip">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
                    <span>by {tip.author}</span>
                    <span>•</span>
                    <span>{new Date(tip.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(tip.category)}`}>
                    {tip.category}
                  </span>
                  
                  {/* Actions Menu for Own Tips */}
                  {canDeleteTip(tip) && (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowDeleteConfirm(showDeleteConfirm === tip.id ? null : tip.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                        title="More actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showDeleteConfirm === tip.id && (
                        <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                          <button
                            onClick={() => handleDeleteTip(tip.id)}
                            disabled={deletingTips.has(tip.id)}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>{deletingTips.has(tip.id) ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tip Content */}
              <p className="text-gray-700 dark:text-slate-300 mb-3">
                {tip.content}
              </p>

              {/* Tags */}
              {tip.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {tip.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Upvote Button */}
                  <button
                    onClick={() => handleVote(tip.id, 'up')}
                    disabled={votingTips.has(tip.id)}
                    className={`flex items-center space-x-1 transition-colors ${
                      tip.userVote === 'up'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400'
                    } ${votingTips.has(tip.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${tip.userVote === 'up' ? 'fill-current' : ''}`} />
                    <span className="text-sm">{tip.likes}</span>
                  </button>

                  {/* Downvote Button */}
                  <button
                    onClick={() => handleVote(tip.id, 'down')}
                    disabled={votingTips.has(tip.id)}
                    className={`flex items-center space-x-1 transition-colors ${
                      tip.userVote === 'down'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400'
                    } ${votingTips.has(tip.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ThumbsDown className={`w-4 h-4 ${tip.userVote === 'down' ? 'fill-current' : ''}`} />
                    <span className="text-sm">{tip.dislikes}</span>
                  </button>

                  {/* Net Score Display */}
                  {tip.netVotes !== 0 && (
                    <div className={`flex items-center space-x-1 text-sm font-medium ${
                      tip.netVotes > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      <span>{tip.netVotes > 0 ? '+' : ''}{tip.netVotes}</span>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => handleViewComments(tip.id)}
                    className="flex items-center space-x-1 text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">{tip.comments}</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBookmark(tip.id)}
                    disabled={bookmarkingTips.has(tip.id)}
                    className={`flex items-center space-x-1 transition-colors ${
                      tip.isBookmarked
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-600 dark:text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-400'
                    } ${bookmarkingTips.has(tip.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {tip.isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4 fill-current" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                    <span className="text-sm">{tip.isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                  
                  <button className="flex items-center space-x-1 text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm">Share</span>
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {selectedTip === tip.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <TipComments 
                    tipId={tip.id} 
                    initialCommentCount={tip.comments}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Tip Modal */}
      <AddTipModal
        isOpen={showAddTip}
        onClose={() => setShowAddTip(false)}
        onTipAdded={handleTipAdded}
      />
    </div>
  );
}