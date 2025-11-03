'use client';

import { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  tier: 'free' | 'basic' | 'premium';
  rateLimitPerHour: number;
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  key?: string; // Only present during creation
}

interface UsageStats {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    successRate: string;
    period: string;
  };
  apiKeys: Array<{
    id: string;
    name: string;
    currentHourUsage: number;
    remainingThisHour: number;
    rate_limit_per_hour: number;
  }>;
}

export function ApiKeyManager() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTier, setNewKeyTier] = useState<'free' | 'basic' | 'premium'>('free');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Get auth token on component mount
  useEffect(() => {
    const getAuthToken = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        setAuthToken(session.access_token);
      }
    };
    getAuthToken();
  }, [user]);

  useEffect(() => {
    if (authToken) {
      fetchApiKeys();
      fetchUsageStats();
    }
  }, [authToken]);

  const fetchApiKeys = async () => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/v1/auth/api-keys', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data);
      } else {
        console.error('Failed to fetch API keys:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    if (!authToken) return;
    
    try {
      const response = await fetch('/api/v1/auth/usage', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    

    
    if (!authToken) {
      alert('Authentication token not available. Please refresh the page.');
      return;
    }
    
    setCreating(true);
    try {
      const payload: any = {
        name: newKeyName.trim(),
        tier: newKeyTier
      };
      
      if (newKeyExpiry) {
        const expiryDate = new Date(newKeyExpiry);
        const daysDiff = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 0) {
          payload.expiresInDays = daysDiff;
        }
      }
      
      const response = await fetch('/api/v1/auth/api-keys', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(prev => [data.data, ...prev]);
        setShowCreateForm(false);
        setNewKeyName('');
        setNewKeyExpiry('');
        
        // Show the new key temporarily
        if (data.data.key) {
          setVisibleKeys(prev => new Set([...prev, data.data.id]));
        }
      } else {
        const error = await response.json();
        alert(`Failed to create API key: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      alert('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/v1/auth/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('Failed to delete API key');
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? It will stop working immediately.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/v1/auth/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ action: 'revoke' })
      });
      
      if (response.ok) {
        setApiKeys(prev => prev.map(key => 
          key.id === keyId ? { ...key, isActive: false } : key
        ));
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to revoke API key');
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      alert('Failed to revoke API key');
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-600 dark:text-slate-400">
          Please log in to manage your API keys.
        </p>
      </div>
    );
  }

  if (loading || !authToken) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-slate-400">
          {!authToken ? 'Getting authentication...' : 'Loading API keys...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">API Keys</h2>
          <p className="text-gray-600 dark:text-slate-400">
            Manage your API keys for programmatic access
          </p>
        </div>
        <TouchFriendlyButton
          onClick={() => setShowCreateForm(true)}
          icon={<Plus />}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Create API Key
        </TouchFriendlyButton>
      </div>

      {/* Usage Summary */}
      {usageStats && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">
            Usage Summary ({usageStats.summary.period})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{usageStats.summary.totalRequests}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{usageStats.summary.successfulRequests}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{usageStats.summary.errorRequests}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{usageStats.summary.successRate}%</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Success Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">
            Create New API Key
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production App, Mobile Client"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Tier
              </label>
              <select
                value={newKeyTier}
                onChange={(e) => setNewKeyTier(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              >
                <option value="free">Free (100 requests/hour)</option>
                <option value="basic">Basic (1,000 requests/hour)</option>
                <option value="premium">Premium (10,000 requests/hour)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
            </div>
            
            <div className="flex gap-3">
              <TouchFriendlyButton
                onClick={createApiKey}
                disabled={creating || !newKeyName.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Key'}
              </TouchFriendlyButton>
              <TouchFriendlyButton
                onClick={() => setShowCreateForm(false)}
                variant="ghost"
              >
                Cancel
              </TouchFriendlyButton>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-6">
        {apiKeys.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
              No API Keys
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Create your first API key to get started with programmatic access.
            </p>
            <TouchFriendlyButton
              onClick={() => setShowCreateForm(true)}
              icon={<Plus />}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Create API Key
            </TouchFriendlyButton>
          </div>
        ) : (
          apiKeys.map((apiKey) => {
            const keyStats = usageStats?.apiKeys.find(k => k.id === apiKey.id);
            const isVisible = visibleKeys.has(apiKey.id);
            const keyToShow = apiKey.key || `${apiKey.keyPrefix}${'*'.repeat(56)}`;
            
            return (
              <div
                key={apiKey.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        {apiKey.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(apiKey.tier)}`}>
                        {apiKey.tier}
                      </span>
                      {!apiKey.isActive && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Revoked
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <code className="bg-gray-100 dark:bg-slate-700 px-4 py-3 rounded-lg text-sm font-mono flex-1 break-all">
                        {isVisible ? keyToShow : `${apiKey.keyPrefix}${'*'.repeat(56)}`}
                      </code>
                      <TouchFriendlyButton
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        variant="ghost"
                        size="sm"
                        icon={isVisible ? <EyeOff /> : <Eye />}
                      >
                        {isVisible ? 'Hide' : 'Show'}
                      </TouchFriendlyButton>
                      {(isVisible || apiKey.key) && (
                        <TouchFriendlyButton
                          onClick={() => copyToClipboard(keyToShow, apiKey.id)}
                          variant="ghost"
                          size="sm"
                          icon={copiedKey === apiKey.id ? <CheckCircle /> : <Copy />}
                          className={copiedKey === apiKey.id ? 'text-green-600' : ''}
                        >
                          {copiedKey === apiKey.id ? 'Copied!' : 'Copy'}
                        </TouchFriendlyButton>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-slate-400 space-y-2">
                      <div>Rate limit: {apiKey.rateLimitPerHour.toLocaleString()} requests/hour</div>
                      {keyStats && (
                        <div>
                          Current hour: {keyStats.currentHourUsage} / {keyStats.rate_limit_per_hour} 
                          ({keyStats.remainingThisHour} remaining)
                        </div>
                      )}
                      <div>Created: {formatDate(apiKey.createdAt)}</div>
                      {apiKey.lastUsedAt && (
                        <div>Last used: {formatDate(apiKey.lastUsedAt)}</div>
                      )}
                      {apiKey.expiresAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Expires: {formatDate(apiKey.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {apiKey.isActive && (
                      <TouchFriendlyButton
                        onClick={() => revokeApiKey(apiKey.id)}
                        variant="ghost"
                        size="sm"
                        icon={<AlertTriangle />}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        Revoke
                      </TouchFriendlyButton>
                    )}
                    <TouchFriendlyButton
                      onClick={() => deleteApiKey(apiKey.id)}
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 />}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </TouchFriendlyButton>
                  </div>
                </div>
                
                {apiKey.key && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Important:</strong> This is the only time you'll see this API key. 
                        Make sure to copy and store it securely.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}