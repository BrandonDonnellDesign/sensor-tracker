'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  CheckCircle, 
  Clock, 
  Zap, 
  Calendar,
  Target,
  AlertCircle,
  Settings,
  BarChart3,
  Users,
  Database,
  Smartphone,
  Brain,
  Shield,
  Globe,
  Heart
} from 'lucide-react';
import {
  fetchRoadmapItems,
  updateRoadmapStatus,
  addRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
  isRoadmapAdmin,
  subscribeToRoadmapChanges,
  type DatabaseRoadmapItem
} from '@/lib/roadmap-service';

const statusOptions = [
  { value: 'completed', label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'in-progress', label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'planned', label: 'Planned', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { value: 'future', label: 'Future', color: 'text-gray-600', bgColor: 'bg-gray-100' }
];

const categoryOptions = [
  { value: 'core', label: 'Core Features', icon: Target },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'integrations', label: 'Integrations', icon: Database },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'ai', label: 'AI/ML', icon: Brain },
  { value: 'social', label: 'Social', icon: Users },
  { value: 'security', label: 'Security', icon: Shield }
];

const priorityOptions = [
  { value: 'high', label: 'High Priority', color: 'text-red-600' },
  { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600' },
  { value: 'low', label: 'Low Priority', color: 'text-gray-600' }
];

const iconOptions = [
  { value: 'Target', label: 'Target', icon: Target },
  { value: 'BarChart3', label: 'Bar Chart', icon: BarChart3 },
  { value: 'Database', label: 'Database', icon: Database },
  { value: 'Smartphone', label: 'Smartphone', icon: Smartphone },
  { value: 'Brain', label: 'Brain', icon: Brain },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Globe', label: 'Globe', icon: Globe },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'Zap', label: 'Zap', icon: Zap }
];

interface EditingItem extends Omit<Partial<DatabaseRoadmapItem>, 'features' | 'tags'> {
  features?: string[];
  tags?: string[];
}

export function RoadmapAdmin() {
  const [items, setItems] = useState<DatabaseRoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToRoadmapChanges(() => {
      console.log('Roadmap updated, refreshing data...');
      loadData();
    });

    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, adminStatus] = await Promise.all([
        fetchRoadmapItems(),
        isRoadmapAdmin()
      ]);
      
      setItems(itemsData);
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        setError('You do not have admin permissions to manage the roadmap.');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load roadmap data.');
    } finally {
      setLoading(false);
    }
  };



  const handleStatusChange = async (itemId: string, status: DatabaseRoadmapItem['status']) => {
    try {
      setSaving(true);
      const result = await updateRoadmapStatus(itemId, status);
      if (result.success) {
        await loadData();
      } else {
        setError(result.error || 'Failed to update status');
      }
    } catch (error) {
      setError('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem({
      item_id: '',
      title: '',
      description: '',
      status: 'planned',
      category: 'core',
      priority: 'medium',
      target_date: null,
      icon_name: 'Target',
      sort_order: items.length + 1,
      features: [''],
      tags: ['']
    });
    setShowAddForm(true);
  };

  const handleSaveItem = async () => {
    if (!editingItem || !editingItem.item_id || !editingItem.title) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      
      if (showEditForm && editingItemId) {
        // Update existing item
        const result = await updateRoadmapItem(editingItemId, {
          item_id: editingItem.item_id,
          title: editingItem.title,
          description: editingItem.description || '',
          status: editingItem.status || 'planned',
          category: editingItem.category || 'core',
          priority: editingItem.priority || 'medium',
          progress: editingItem.progress || 0,
          target_date: editingItem.target_date || null,
          icon_name: editingItem.icon_name || 'Target',
          sort_order: editingItem.sort_order || items.length + 1,
          features: editingItem.features?.filter(f => f.trim()) || [],
          tags: editingItem.tags?.filter(t => t.trim()) || []
        });

        if (result.success) {
          setShowEditForm(false);
          setEditingItem(null);
          setEditingItemId(null);
          await loadData();
        } else {
          setError(result.error || 'Failed to update item');
        }
      } else {
        // Add new item
        const result = await addRoadmapItem({
          item_id: editingItem.item_id,
          title: editingItem.title,
          description: editingItem.description || '',
          status: editingItem.status || 'planned',
          category: editingItem.category || 'core',
          priority: editingItem.priority || 'medium',
          progress: editingItem.progress || 0,
          target_date: editingItem.target_date || null,
          icon_name: editingItem.icon_name || 'Target',
          sort_order: editingItem.sort_order || items.length + 1,
          features: editingItem.features?.filter(f => f.trim()) || [],
          tags: editingItem.tags?.filter(t => t.trim()) || []
        });

        if (result.success) {
          setShowAddForm(false);
          setEditingItem(null);
          await loadData();
        } else {
          setError(result.error || 'Failed to add item');
        }
      }
    } catch (error) {
      setError('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = (item: DatabaseRoadmapItem) => {
    setEditingItem({
      item_id: item.item_id,
      title: item.title,
      description: item.description,
      status: item.status,
      category: item.category,
      priority: item.priority,
      target_date: item.target_date,
      icon_name: item.icon_name,
      sort_order: item.sort_order,
      features: item.features?.map(f => f.feature_text) || [''],
      tags: item.tags?.map(t => t.tag_name) || ['']
    });
    setEditingItemId(item.item_id);
    setShowEditForm(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this roadmap item? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      const result = await deleteRoadmapItem(itemId);
      
      if (result.success) {
        await loadData();
      } else {
        setError(result.error || 'Failed to delete item');
      }
    } catch (error) {
      setError('Failed to delete item');
    } finally {
      setSaving(false);
    }
  };

  const updateEditingField = (field: string, value: any) => {
    setEditingItem(prev => prev ? { ...prev, [field]: value } : null);
  };

  const addFeature = () => {
    setEditingItem(prev => prev ? {
      ...prev,
      features: [...(prev.features || []), '']
    } : null);
  };

  const updateFeature = (index: number, value: string) => {
    setEditingItem(prev => prev ? {
      ...prev,
      features: prev.features?.map((f, i) => i === index ? value : f) || []
    } : null);
  };

  const removeFeature = (index: number) => {
    setEditingItem(prev => prev ? {
      ...prev,
      features: prev.features?.filter((_, i) => i !== index) || []
    } : null);
  };

  const addTag = () => {
    setEditingItem(prev => prev ? {
      ...prev,
      tags: [...(prev.tags || []), '']
    } : null);
  };

  const updateTag = (index: number, value: string) => {
    setEditingItem(prev => prev ? {
      ...prev,
      tags: prev.tags?.map((t, i) => i === index ? value : t) || []
    } : null);
  };

  const removeTag = (index: number) => {
    setEditingItem(prev => prev ? {
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || []
    } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-slate-400">Loading admin panel...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 dark:text-slate-400">
          You need admin permissions to access the roadmap management panel.
        </p>
      </div>
    );
  }

  // Helper to get a quarter label from an item
  const getQuarterLabel = (item: DatabaseRoadmapItem) => {
    if (item.estimated_quarter) return item.estimated_quarter;
    if (item.target_date) {
      try {
        const d = new Date(item.target_date);
        if (isNaN(d.getTime())) return 'Unscheduled';
        const year = d.getFullYear();
        const month = d.getMonth(); // 0-based
        const quarter = Math.floor(month / 3) + 1;
        return `Q${quarter} ${year}`;
      } catch (e) {
        return 'Unscheduled';
      }
    }
    return 'Unscheduled';
  };

  // Group items by quarter and sort groups chronologically, then sort items by sort_order
  const groupedItems: Record<string, DatabaseRoadmapItem[]> = {};
  items.forEach(item => {
    const q = getQuarterLabel(item) || 'Unscheduled';
    if (!groupedItems[q]) groupedItems[q] = [];
    groupedItems[q].push(item);
  });

  const sortQuarterKey = (key: string) => {
    // Parse keys like 'Q1 2025' -> [2025,1]. Put 'Unscheduled' at the end.
    if (key === 'Unscheduled') return [9999, 9];
    const m = key.match(/Q(\d)\s+(\d{4})/);
    if (m) {
      const quarter = parseInt(m[1], 10);
      const year = parseInt(m[2], 10);
      return [year, quarter];
    }
    return [9999, 9];
  };

  const sortedGroupKeys = Object.keys(groupedItems).sort((a, b) => {
    const pa = sortQuarterKey(a);
    const pb = sortQuarterKey(b);
    if (pa[0] !== pb[0]) return pa[0] - pb[0];
    return pa[1] - pb[1];
  });

  sortedGroupKeys.forEach(k => {
    groupedItems[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  });

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Roadmap Items ({items.length})
          </h2>
          <p className="text-gray-600 dark:text-slate-400">
            Manage roadmap items, update progress, and track development
          </p>
        </div>
        
        <button
          onClick={handleAddItem}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {(showAddForm || showEditForm) && editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  {showEditForm ? 'Edit Roadmap Item' : 'Add New Roadmap Item'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setShowEditForm(false);
                    setEditingItem(null);
                    setEditingItemId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Item ID *
                    </label>
                    <input
                      type="text"
                      value={editingItem.item_id || ''}
                      onChange={(e) => updateEditingField('item_id', e.target.value)}
                      placeholder="e.g., mobile-app-v2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={editingItem.title || ''}
                      onChange={(e) => updateEditingField('title', e.target.value)}
                      placeholder="Feature title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingItem.description || ''}
                      onChange={(e) => updateEditingField('description', e.target.value)}
                      placeholder="Detailed description of the feature"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={editingItem.target_date || ''}
                      onChange={(e) => updateEditingField('target_date', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Quarter will be calculated automatically from this date
                    </p>
                  </div>
                </div>

                {/* Dropdowns */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      value={editingItem.status || 'planned'}
                      onChange={(e) => updateEditingField('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={editingItem.category || 'core'}
                      onChange={(e) => updateEditingField('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={editingItem.priority || 'medium'}
                      onChange={(e) => updateEditingField('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    >
                      {priorityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Icon
                    </label>
                    <select
                      value={editingItem.icon_name || 'Target'}
                      onChange={(e) => updateEditingField('icon_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    >
                      {iconOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Features
                  </label>
                  <button
                    onClick={addFeature}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Feature
                  </button>
                </div>
                <div className="space-y-2">
                  {editingItem.features?.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder="Feature description"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      />
                      <button
                        onClick={() => removeFeature(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Tags
                  </label>
                  <button
                    onClick={addTag}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Tag
                  </button>
                </div>
                <div className="space-y-2">
                  {editingItem.tags?.map((tag, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => updateTag(index, e.target.value)}
                        placeholder="Tag name"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      />
                      <button
                        onClick={() => removeTag(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setShowEditForm(false);
                    setEditingItem(null);
                    setEditingItemId(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : (showEditForm ? 'Update Item' : 'Save Item')}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items List grouped by quarter */}
      <div className="space-y-6">
        {sortedGroupKeys.map((groupKey) => (
          <div key={groupKey}>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
              {groupKey}
            </h4>
            <div className="space-y-4">
              {groupedItems[groupKey].map((item) => {
                const statusOption = statusOptions.find(s => s.value === item.status);
                const categoryOption = categoryOptions.find(c => c.value === item.category);
                const priorityOption = priorityOptions.find(p => p.value === item.priority);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {item.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusOption?.bgColor} ${statusOption?.color}`}>
                            {statusOption?.label}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityOption?.color} bg-gray-100 dark:bg-slate-700`}>
                            {priorityOption?.label}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-slate-400 mb-2">
                          {item.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400">
                          <span>ID: {item.item_id}</span>
                          <span>{categoryOption?.label}</span>
                          <span>{item.features?.length || 0} features</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditItem(item)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.item_id)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          title="Delete item"
                          disabled={saving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Status Controls */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        Status:
                      </label>
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.item_id, e.target.value as DatabaseRoadmapItem['status'])}
                        disabled={saving}
                        className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            No roadmap items found
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            Get started by adding your first roadmap item.
          </p>
          <button
            onClick={handleAddItem}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Item</span>
          </button>
        </div>
      )}
    </div>
  );
}