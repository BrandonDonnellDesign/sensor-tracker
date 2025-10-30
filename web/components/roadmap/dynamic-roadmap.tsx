'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  Zap,
  Calendar,
  Filter,
  Users,
  Target,
  Info,
  RefreshCw,
  Edit,
  Plus,
} from 'lucide-react';
import {
  fetchRoadmapItems,
  fetchRoadmapStats,
  isRoadmapAdmin,
  subscribeToRoadmapChanges,
  type DatabaseRoadmapItem,
  type RoadmapStats,
} from '@/lib/roadmap-service';

const statusConfig = {
  completed: {
    label: 'Completed',
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    bgColor: 'bg-green-500',
    iconColor: 'text-green-500',
    icon: CheckCircle,
  },
  'in-progress': {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    bgColor: 'bg-blue-500',
    iconColor: 'text-blue-500',
    icon: Zap,
  },
  planned: {
    label: 'Planned',
    color:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    bgColor: 'bg-yellow-500',
    iconColor: 'text-yellow-500',
    icon: Calendar,
  },
  future: {
    label: 'Future',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-500',
    iconColor: 'text-gray-500',
    icon: Clock,
  },
};

const categoryConfig = {
  core: { label: 'Core Features', color: 'bg-blue-500' },
  analytics: { label: 'Analytics', color: 'bg-purple-500' },
  integrations: { label: 'Integrations', color: 'bg-green-500' },
  mobile: { label: 'Mobile', color: 'bg-orange-500' },
  ai: { label: 'AI/ML', color: 'bg-pink-500' },
  social: { label: 'Social', color: 'bg-indigo-500' },
  security: { label: 'Security', color: 'bg-red-500' },
};

interface DynamicRoadmapProps {
  showFilters?: boolean;
  showStats?: boolean;
  showAdminControls?: boolean;
}

export function DynamicRoadmap({
  showFilters = true,
  showStats = true,
  showAdminControls = false,
}: DynamicRoadmapProps) {
  const [items, setItems] = useState<DatabaseRoadmapItem[]>([]);
  const [stats, setStats] = useState<RoadmapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load initial data
  useEffect(() => {
    loadRoadmapData();
    checkAdminStatus();
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToRoadmapChanges(() => {
      console.log('Roadmap updated, refreshing data...');
      loadRoadmapData();
    });

    return unsubscribe;
  }, []);

  const loadRoadmapData = async () => {
    try {
      setRefreshing(true);
      const [itemsData, statsData] = await Promise.all([
        fetchRoadmapItems(),
        fetchRoadmapStats(),
      ]);

      setItems(itemsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading roadmap data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkAdminStatus = async () => {
    const adminStatus = await isRoadmapAdmin();
    setIsAdmin(adminStatus);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (!showCompleted && item.status === 'completed') return false;
      return true;
    });
  }, [items, selectedCategory, selectedStatus, showCompleted]);

  // Group items by quarter for better organization
  const groupedItems = useMemo(() => {
    const groups: Record<string, DatabaseRoadmapItem[]> = {};
    
    filteredItems.forEach((item) => {
      const quarter = item.estimated_quarter;
      if (!groups[quarter]) {
        groups[quarter] = [];
      }
      groups[quarter].push(item);
    });

    // Sort quarters chronologically
    const sortedQuarters = Object.keys(groups).sort((a, b) => {
      // Extract year and quarter number for proper sorting
      const [aQ, aYear] = a.split(' ');
      const [bQ, bYear] = b.split(' ');
      
      if (aYear !== bYear) {
        return parseInt(aYear) - parseInt(bYear);
      }
      
      return parseInt(aQ.replace('Q', '')) - parseInt(bQ.replace('Q', ''));
    });

    return sortedQuarters.map(quarter => ({
      quarter,
      items: groups[quarter]
    }));
  }, [filteredItems]);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        <span className='ml-3 text-gray-600 dark:text-slate-400'>
          Loading roadmap...
        </span>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Header with Refresh Button */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
            Dynamic Roadmap
          </h2>
          {stats && (
            <span className='text-sm text-gray-500 dark:text-slate-400'>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          <button
            onClick={loadRoadmapData}
            disabled={refreshing}
            className='flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50'>
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>

          {isAdmin && showAdminControls && (
            <button className='flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors'>
              <Plus className='w-4 h-4' />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Stats Section */}
      {showStats && stats && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
          <div className='bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700'>
            <div className='flex items-center justify-center mb-2'>
              <Target className='w-5 h-5 text-blue-500' />
            </div>
            <div className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
              {stats.totalItems}
            </div>
            <div className='text-sm text-gray-600 dark:text-slate-400'>
              Total Items
            </div>
          </div>

          <div className='bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700'>
            <div className='flex items-center justify-center mb-2'>
              <CheckCircle className='w-5 h-5 text-green-500' />
            </div>
            <div className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
              {stats.completed}
            </div>
            <div className='text-sm text-gray-600 dark:text-slate-400'>
              Completed
            </div>
          </div>

          <div className='bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700'>
            <div className='flex items-center justify-center mb-2'>
              <Zap className='w-5 h-5 text-blue-500' />
            </div>
            <div className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
              {stats['in-progress']}
            </div>
            <div className='text-sm text-gray-600 dark:text-slate-400'>
              In Progress
            </div>
          </div>

          <div className='bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700'>
            <div className='flex items-center justify-center mb-2'>
              <Calendar className='w-5 h-5 text-yellow-500' />
            </div>
            <div className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
              {stats.planned}
            </div>
            <div className='text-sm text-gray-600 dark:text-slate-400'>
              Planned
            </div>
          </div>

          <div className='bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700'>
            <div className='flex items-center justify-center mb-2'>
              <Users className='w-5 h-5 text-indigo-500' />
            </div>
            <div className='text-2xl font-bold text-gray-900 dark:text-slate-100'>
              {stats.totalFeatures}
            </div>
            <div className='text-sm text-gray-600 dark:text-slate-400'>
              Features
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700'>
          <div className='flex items-center space-x-2 mb-4'>
            <Filter className='w-5 h-5 text-gray-500' />
            <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              Filters
            </h3>
          </div>

          <div className='flex flex-wrap gap-4'>
            {/* Status Filters */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                Status
              </label>
              <div className='flex flex-wrap gap-2'>
                <button
                  onClick={() => setSelectedStatus(null)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    !selectedStatus
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}>
                  All
                </button>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}>
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filters */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                Category
              </label>
              <div className='flex flex-wrap gap-2'>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    !selectedCategory
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}>
                  All
                </button>
                {Object.entries(categoryConfig).map(([category, config]) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}>
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Completed */}
            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700 dark:text-slate-300'>
                Options
              </label>
              <label className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='text-sm text-gray-700 dark:text-slate-300'>
                  Show completed
                </span>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Roadmap Items Grouped by Quarter */}
      <div className='space-y-8'>
        <AnimatePresence mode='popLayout'>
          {groupedItems.map(({ quarter, items: quarterItems }) => (
            <motion.div
              key={quarter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='space-y-4'>
              
              {/* Quarter Header */}
              <div className='flex items-center space-x-3 mb-6'>
                <div className='flex items-center space-x-2'>
                  <Calendar className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                  <h3 className='text-xl font-bold text-gray-900 dark:text-slate-100'>
                    {quarter}
                  </h3>
                </div>
                <div className='flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent dark:from-blue-800'></div>
                <span className='text-sm text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full'>
                  {quarterItems.length} {quarterItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Quarter Items */}
              <div className='space-y-4'>
                {quarterItems.map((item) => {
            const statusConfig_ = statusConfig[item.status];
            const categoryConfig_ = categoryConfig[item.category];
            const StatusIcon = statusConfig_.icon;
            const ItemIcon = item.icon || Target;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                layout
                className='bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden'>
                <div className='p-6'>
                  <div className='flex items-start space-x-4'>
                    <motion.div
                      className={`w-12 h-12 ${categoryConfig_.color} rounded-xl flex items-center justify-center flex-shrink-0`}
                      whileHover={{ scale: 1.1 }}>
                      <ItemIcon className='w-6 h-6 text-white' />
                    </motion.div>

                    <div className='flex-1'>
                      <div className='flex items-start justify-between mb-3'>
                        <div>
                          <h3 className='text-xl font-semibold text-gray-900 dark:text-slate-100 mb-1'>
                            {item.title}
                          </h3>
                          <p className='text-gray-600 dark:text-slate-400'>
                            {item.description}
                          </p>
                        </div>

                        <div className='flex items-center space-x-2 flex-shrink-0 ml-4'>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig_.color}`}>
                            <StatusIcon
                              className={`w-4 h-4 mr-1 ${statusConfig_.iconColor}`}
                            />
                            {statusConfig_.label}
                          </span>
                          {isAdmin && showAdminControls && (
                            <button className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'>
                              <Edit className='w-4 h-4' />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className='flex items-center space-x-4 mb-4 text-sm text-gray-500 dark:text-slate-400'>
                        <span className='flex items-center font-medium'>
                          <Calendar className='w-4 h-4 mr-1' />
                          {item.estimated_quarter}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium text-white ${categoryConfig_.color}`}>
                          {categoryConfig_.label}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.priority === 'high'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : item.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                          {item.priority} priority
                        </span>
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className='flex flex-wrap gap-1 mb-4'>
                          {item.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'>
                              #{tag.tag_name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Features */}
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                        {item.features?.map((feature) => (
                          <div
                            key={feature.id}
                            className='flex items-center text-sm text-gray-700 dark:text-slate-300'>
                            <CheckCircle
                              className={`w-4 h-4 mr-2 flex-shrink-0 ${
                                feature.is_completed
                                  ? 'text-green-500'
                                  : 'text-gray-300 dark:text-slate-600'
                              }`}
                            />
                            <span
                              className={
                                feature.is_completed ? '' : 'opacity-60'
                              }>
                              {feature.feature_text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
                );
              })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No Results State */}
      {filteredItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='text-center py-12'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Info className='w-8 h-8 text-gray-400' />
          </div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-slate-100 mb-2'>
            No items found
          </h3>
          <p className='text-gray-600 dark:text-slate-400'>
            Try adjusting your filters to see more roadmap items.
          </p>
        </motion.div>
      )}
    </div>
  );
}
