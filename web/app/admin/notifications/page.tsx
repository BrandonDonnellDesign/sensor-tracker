'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { Bell, Send, Clock, AlertTriangle, CheckCircle, RefreshCw, Plus, X } from 'lucide-react';

interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  pending: number;
  failed: number;
  deliveryRate: number;
}

interface NotificationTypeStats {
  [key: string]: number;
}

interface RecentNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: 'pending' | 'sent' | 'failed';
  delivery_status: 'pending' | 'delivered' | 'failed' | null;
  created_at: string;
  retry_count: number;
}

interface NotificationTemplate {
  name: string;
  type: string;
  title_template: string;
  message_template: string;
  variables: string;
  ab_test_group: string;
  ab_test_weight: number;
}

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    sent: 0,
    delivered: 0,
    pending: 0,
    failed: 0,
    deliveryRate: 0,
  });
  const [typeStats, setTypeStats] = useState<NotificationTypeStats>({});
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<(NotificationTemplate & { id: string })[]>([]);
  const [templateForm, setTemplateForm] = useState<NotificationTemplate>({
    name: '',
    type: 'sensor_expiry_warning',
    title_template: '',
    message_template: '',
    variables: '{}',
    ab_test_group: 'default',
    ab_test_weight: 100
  });

  const loadNotificationData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch notification stats
      const statsResponse = await fetch(`/api/admin/notifications/stats?range=${timeRange}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch notification type breakdown
      const typesResponse = await fetch(`/api/admin/notifications/types?range=${timeRange}`);
      if (typesResponse.ok) {
        const typesData = await typesResponse.json();
        setTypeStats(typesData);
      }

      // Fetch recent notifications
      const recentResponse = await fetch('/api/admin/notifications/recent?limit=10');
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentNotifications(recentData);
      }

      // Fetch notification templates
      const templatesResponse = await fetch('/api/admin/notification-templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);
      }

    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadNotificationData();
  }, [loadNotificationData]);

  const handleRetryFailed = async () => {
    try {
      const response = await fetch('/api/admin/notifications/retry-failed', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Retried ${result.count} failed notifications`);
        loadNotificationData(); // Refresh data
      }
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      alert('Failed to retry notifications');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const url = editingTemplate 
        ? `/api/admin/notification-templates/${editingTemplate}`
        : '/api/admin/notification-templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateForm.name,
          type: templateForm.type,
          titleTemplate: templateForm.title_template,
          messageTemplate: templateForm.message_template,
          variables: JSON.parse(templateForm.variables || '{}'),
          abTestGroup: templateForm.ab_test_group,
          abTestWeight: templateForm.ab_test_weight,
          isActive: true
        }),
      });

      if (response.ok) {
        alert(`Template ${editingTemplate ? 'updated' : 'created'} successfully!`);
        setShowTemplateModal(false);
        setEditingTemplate(null);
        setTemplateForm({
          name: '',
          type: 'sensor_expiry_warning',
          title_template: '',
          message_template: '',
          variables: '{}',
          ab_test_group: 'default',
          ab_test_weight: 100
        });
        loadNotificationData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Failed to ${editingTemplate ? 'update' : 'create'} template: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error ${editingTemplate ? 'updating' : 'creating'} template:`, error);
      alert(`Failed to ${editingTemplate ? 'update' : 'create'} template`);
    }
  };

  const handleEditTemplate = (template: NotificationTemplate & { id: string }) => {
    setEditingTemplate(template.id);
    setTemplateForm({
      name: template.name,
      type: template.type,
      title_template: template.title_template,
      message_template: template.message_template,
      variables: JSON.stringify(template.variables || {}, null, 2),
      ab_test_group: template.ab_test_group,
      ab_test_weight: template.ab_test_weight
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/notification-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Template deleted successfully!');
        loadNotificationData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Failed to delete template: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Notification Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
              Monitor notification delivery and queue status
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button
              onClick={handleRetryFailed}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Failed</span>
            </button>
            <button 
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Template</span>
            </button>
          </div>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Send className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Sent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.sent.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Delivered</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.delivered.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.pending.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Failed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.failed.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Delivery Performance</h2>
            <div className="space-y-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Delivery Rate</span>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{stats.deliveryRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    stats.deliveryRate >= 95 ? 'bg-green-600' :
                    stats.deliveryRate >= 85 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${stats.deliveryRate}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    {stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">Failed</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Notification Types</h2>
            <div className="space-y-3">
              {Object.entries(typeStats).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-slate-400 capitalize">
                    {type.replace('_', ' ')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
              {Object.keys(typeStats).length === 0 && (
                <div className="text-center text-gray-500 dark:text-slate-500 py-4">
                  No notifications in selected time range
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Recent Notifications</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Retries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                {recentNotifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {notification.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs">
                        {notification.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 capitalize">
                      {notification.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        notification.status === 'sent' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : notification.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {notification.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {notification.delivery_status ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          notification.delivery_status === 'delivered' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : notification.delivery_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {notification.delivery_status}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {notification.retry_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentNotifications.length === 0 && (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400">No notifications found</p>
              </div>
            )}
          </div>
        </div>

        {/* Notification Templates */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Notification Templates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    A/B Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs">
                        {template.title_template}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 capitalize">
                      {template.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {template.ab_test_group}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {template.ab_test_weight}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {templates.length === 0 && (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400">No templates found</p>
              </div>
            )}
          </div>
        </div>

        {/* Template Creation Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h2>
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="e.g., Sensor Expiry - Friendly Reminder"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Notification Type
                  </label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  >
                    <option value="sensor_expiry_warning">Sensor Expiry Warning</option>
                    <option value="sensor_expired">Sensor Expired</option>
                    <option value="welcome">Welcome Message</option>
                    <option value="system">System Notification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Title Template
                  </label>
                  <input
                    type="text"
                    value={templateForm.title_template}
                    onChange={(e) => setTemplateForm({ ...templateForm, title_template: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="e.g., Time to replace your sensor!"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Use variables: {'{'}{'{'} userName {'}'}{'}'}, {'{'}{'{'} sensorSerial {'}'}{'}'}, {'{'}{'{'} daysLeft {'}'}{'}'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Message Template
                  </label>
                  <textarea
                    value={templateForm.message_template}
                    onChange={(e) => setTemplateForm({ ...templateForm, message_template: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="e.g., Hi {{userName}}, your sensor {{sensorSerial}} will expire in {{daysLeft}} days."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      A/B Test Group
                    </label>
                    <input
                      type="text"
                      value={templateForm.ab_test_group}
                      onChange={(e) => setTemplateForm({ ...templateForm, ab_test_group: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      placeholder="e.g., friendly, urgent, default"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      A/B Test Weight
                    </label>
                    <input
                      type="number"
                      value={templateForm.ab_test_weight}
                      onChange={(e) => setTemplateForm({ ...templateForm, ab_test_weight: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Variables (JSON)
                  </label>
                  <textarea
                    value={templateForm.variables}
                    onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-mono text-sm"
                    placeholder='{"userName": "string", "sensorSerial": "string", "daysLeft": "number"}'
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}