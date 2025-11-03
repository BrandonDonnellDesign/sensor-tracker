'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Activity,
  Clock,
  CheckCircle,
  Loader2,
  Code,
  Globe
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  rateLimit: string;
  isActive: boolean;
  lastUsed?: string;
  expiresAt?: string;
  createdAt: string;
}

interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  topEndpoints: Record<string, { count: number; avg_response_time: number }>;
  dailyUsage: Record<string, { requests: number; avg_response_time: number }>;
}

export default function ApiManagementDashboard() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageStats, setUsageStats] = useState<ApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read:public']);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('authenticated');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const availablePermissions = [
    { id: 'read:public', name: 'Read Public Data', description: 'Access public community content' },
    { id: 'read:community', name: 'Read Community', description: 'Access all community content' },
    { id: 'write:community', name: 'Write Community', description: 'Create and edit community content' },
    { id: 'read:profile', name: 'Read Profile', description: 'Access user profile data' },
    { id: 'write:profile', name: 'Write Profile', description: 'Modify user profile data' }
  ];

  const rateLimitOptions = [
    { id: 'public', name: 'Public (100/hour)', description: 'Basic rate limit for public access' },
    { id: 'authenticated', name: 'Authenticated (1,000/hour)', description: 'Standard rate limit for authenticated users' },
    { id: 'premium', name: 'Premium (10,000/hour)', description: 'High rate limit for premium users' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load API keys and usage stats
      const [keysResponse, statsResponse] = await Promise.all([
        authenticatedFetch('/api/admin/api-keys'),
        authenticatedFetch('/api/admin/api-usage-stats')
      ]);

      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        setApiKeys(keysData.apiKeys || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setUsageStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error loading API data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const response = await authenticatedFetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions,
          rateLimit: newKeyRateLimit
        })
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(prev => [data.apiKey, ...prev]);
        setShowNewKeyForm(false);
        setNewKeyName('');
        setNewKeyPermissions(['read:public']);
        setNewKeyRateLimit('authenticated');
        alert('✅ API key created successfully!');
      } else {
        alert('❌ Failed to create API key');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('❌ Error creating API key');
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/admin/api-keys/${keyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
        alert('✅ API key revoked successfully');
      } else {
        alert('❌ Failed to revoke API key');
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      alert('❌ Error revoking API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading API management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
          <p className="text-gray-600">Manage API keys and monitor usage</p>
        </div>
        <button
          onClick={() => setShowNewKeyForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </button>
      </div>

      {/* Usage Statistics */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{usageStats.totalRequests.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usageStats.totalRequests > 0 
                    ? Math.round((usageStats.successfulRequests / usageStats.totalRequests) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(usageStats.avgResponseTime)}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Keys</p>
                <p className="text-2xl font-bold text-gray-900">{apiKeys.filter(k => k.isActive).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
          <p className="text-gray-600">Manage your API keys and their permissions</p>
        </div>

        <div className="p-6">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No API keys created yet</p>
              <button
                onClick={() => setShowNewKeyForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Create your first API key
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          apiKey.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {apiKey.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {apiKey.rateLimit}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <span>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                        {apiKey.lastUsed && (
                          <span>Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}</span>
                        )}
                        {apiKey.expiresAt && (
                          <span>Expires: {new Date(apiKey.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {visibleKeys.has(apiKey.id) ? apiKey.key : '••••••••••••••••••••••••••••••••'}
                          </code>
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {apiKey.permissions.map((permission) => (
                            <span
                              key={permission}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => revokeApiKey(apiKey.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showNewKeyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New API Key</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="My API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate Limit
                </label>
                <select
                  value={newKeyRateLimit}
                  onChange={(e) => setNewKeyRateLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {rateLimitOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availablePermissions.map((permission) => (
                    <label key={permission.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes(permission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKeyPermissions(prev => [...prev, permission.id]);
                          } else {
                            setNewKeyPermissions(prev => prev.filter(p => p !== permission.id));
                          }
                        }}
                        className="mr-2"
                      />
                      <div>
                        <div className="text-sm font-medium">{permission.name}</div>
                        <div className="text-xs text-gray-600">{permission.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewKeyForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createApiKey}
                disabled={!newKeyName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Documentation Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
          <Code className="h-5 w-5 mr-2" />
          API Documentation
        </h3>
        <p className="text-blue-800 mb-4">
          Access the complete API documentation and interactive examples.
        </p>
        <div className="flex space-x-3">
          <a
            href="/api/v1/docs"
            target="_blank"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Globe className="h-4 w-4 mr-2" />
            View OpenAPI Spec
          </a>
          <a
            href="/docs/api"
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100"
          >
            <Code className="h-4 w-4 mr-2" />
            Interactive Docs
          </a>
        </div>
      </div>
    </div>
  );
}