'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '@/components/admin/admin-guard';
import { MessageSquare, Lightbulb, Bug, Zap, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';

interface Feedback {
  id: string;
  type: 'feature' | 'bug' | 'improvement';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  status: 'submitted' | 'reviewing' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  user_email?: string;
  votes: number;
  created_at: string;
  updated_at: string;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    type: '',
    category: '',
  });

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);
      if (filter.category) params.append('category', filter.category);
      params.append('limit', '100');

      const response = await fetch(`/api/feedback?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setFeedback(result.data);
      } else {
        console.error('Failed to fetch feedback:', result.error);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchFeedback();
  }, [filter, fetchFeedback]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Lightbulb className="w-4 h-4" />;
      case 'bug': return <Bug className="w-4 h-4" />;
      case 'improvement': return <Zap className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'bug': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'improvement': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300';
      case 'reviewing': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'planned': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in_progress': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'reviewing': return <Eye className="w-4 h-4" />;
      case 'planned': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => router.push('/admin/overview')}
              className="flex items-center gap-0.5 px-1.5 py-0.5 mb-2 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 text-xs text-gray-700 dark:text-slate-200 rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-all duration-150"
            >
              <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mb-2">
              User Feedback
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400">
              Manage user feedback, feature requests, and bug reports
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="reviewing">Reviewing</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
            >
              <option value="">All Types</option>
              <option value="feature">Features</option>
              <option value="bug">Bugs</option>
              <option value="improvement">Improvements</option>
            </select>

            <button
              onClick={fetchFeedback}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20 dark:border-slate-700/50">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md shadow-blue-500/25">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Features</p>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {feedback.filter(f => f.type === 'feature').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20 dark:border-slate-700/50">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md shadow-red-500/25">
                <Bug className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Bugs</p>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {feedback.filter(f => f.type === 'bug').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20 dark:border-slate-700/50">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md shadow-green-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Improvements</p>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {feedback.filter(f => f.type === 'improvement').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20 dark:border-slate-700/50">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md shadow-purple-500/25">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Pending</p>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {feedback.filter(f => f.status === 'submitted').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50 dark:border-slate-700/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/50 dark:to-slate-700/50">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">Feedback Items</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-0.5">
              {feedback.length} items found
            </p>
          </div>
          
          {feedback.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">No Feedback Found</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                No feedback matches the current filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
              {feedback.map((item) => (
                <div key={item.id} className="px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${getTypeColor(item.type)}`}>
                          {getTypeIcon(item.type)}
                          <span className="ml-1">{item.type.toUpperCase()}</span>
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">
                        {item.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-500">
                        <span>Category: {item.category}</span>
                        {item.user_email && <span>From: {item.user_email}</span>}
                        <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                        {item.votes > 0 && <span>Votes: {item.votes}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}