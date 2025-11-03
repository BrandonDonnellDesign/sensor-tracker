'use client';

import { useState, useEffect } from 'react';
import { 
  BookmarkCheck,
  ThumbsUp, 
  MessageCircle, 
  Calendar,
  Tag,
  CheckCircle,
  Search
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';

interface BookmarkedTip {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  likes: number;
  dislikes: number;
  netVotes: number;
  comments: number;
  createdAt: string;
  bookmarkedAt: string;
  isVerified: boolean;
  tags: string[];
  userVote: 'up' | 'down' | null;
  isBookmarked: boolean;
}

interface BookmarkedTipsProps {
  className?: string;
}

export function BookmarkedTips({ className = '' }: BookmarkedTipsProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkedTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/community/bookmarks');
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }
      
      const data = await response.json();
      setBookmarks(data.bookmarks || []);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter bookmarks based on search and category
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bookmark.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || bookmark.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'insertion', label: 'Insertion' },
    { value: 'adhesion', label: 'Adhesion' },
    { value: 'longevity', label: 'Longevity' },
    { value: 'troubleshooting', label: 'Troubleshooting' },
    { value: 'general', label: 'General' }
  ];

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
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <BookmarkCheck className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Bookmarked Tips ({bookmarks.length})
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Your saved community tips and advice
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookmarked tips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="p-6">
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-8">
            <BookmarkCheck className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400">
              {bookmarks.length === 0 
                ? "No bookmarked tips yet. Start saving helpful tips from the community!"
                : "No tips match your search criteria."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {/* Tip Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-slate-100">
                        {bookmark.title}
                      </h4>
                      {bookmark.isVerified && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
                      <span>by {bookmark.author}</span>
                      <span>•</span>
                      <span>Saved {new Date(bookmark.bookmarkedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                    {bookmark.category}
                  </span>
                </div>

                {/* Tip Content */}
                <p className="text-gray-700 dark:text-slate-300 mb-3 text-sm leading-relaxed">
                  {bookmark.content}
                </p>

                {/* Tags */}
                {bookmark.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {bookmark.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded text-xs flex items-center"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-slate-400">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{bookmark.likes}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-slate-400">
                      <MessageCircle className="w-4 h-4" />
                      <span>{bookmark.comments}</span>
                    </div>

                    {bookmark.netVotes !== 0 && (
                      <div className={`text-sm font-medium ${
                        bookmark.netVotes > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {bookmark.netVotes > 0 ? '+' : ''}{bookmark.netVotes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>Posted {new Date(bookmark.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}