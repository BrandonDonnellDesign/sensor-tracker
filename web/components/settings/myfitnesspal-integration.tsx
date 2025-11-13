'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Utensils, RefreshCw, CheckCircle, XCircle, Loader2, ExternalLink, Zap } from 'lucide-react';

// Temporarily disabled - set to true to enable
const MYFITNESSPAL_ENABLED = false;

interface MFPStatus {
  connected: boolean;
  connectedAt?: string;
  expiresAt?: string;
  settings?: {
    sync_frequency_minutes: number;
    auto_sync_enabled: boolean;
    sync_food_logs: boolean;
    sync_water_intake: boolean;
    sync_exercise: boolean;
    last_sync_at?: string;
  };
  recentSyncs?: Array<{
    created_at: string;
    status: string;
    records_processed: number;
    operation: string;
  }>;
}

export function MyFitnessPalIntegration() {
  const { user } = useAuth();
  const [status, setStatus] = useState<MFPStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (MYFITNESSPAL_ENABLED) {
      loadStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/myfitnesspal/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to load MyFitnessPal status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (!user) return;
    
    const clientId = process.env.NEXT_PUBLIC_MYFITNESSPAL_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/myfitnesspal/callback`;
    const state = user.id;
    
    const authUrl = `https://www.myfitnesspal.com/oauth2/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=diary&` +
      `state=${state}`;
    
    window.location.href = authUrl;
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/myfitnesspal/sync', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Successfully synced ${data.recordsSynced} food entries`
        });
        loadStatus();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Sync failed'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to sync with MyFitnessPal'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect MyFitnessPal?')) return;
    
    try {
      const response = await fetch('/api/myfitnesspal/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'MyFitnessPal disconnected successfully'
        });
        loadStatus();
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to disconnect'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to disconnect MyFitnessPal'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Show "Coming Soon" state if disabled
  if (!MYFITNESSPAL_ENABLED) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Utensils className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                MyFitnessPal
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Sync your food diary and nutrition data
              </p>
            </div>
          </div>
          
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            <Zap className="w-3 h-3 mr-1" />
            Coming Soon
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-slate-100">
            Automatic Food Diary Sync
          </h4>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            MyFitnessPal integration is currently in development. This feature will allow you to 
            automatically sync your food diary, nutrition data, and meal information.
          </p>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
              Planned Features:
            </p>
            <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                Automatic food log synchronization
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                Nutrition tracking (calories, carbs, protein, fat)
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                Meal timing and portion sizes
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                Water intake tracking
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                Real-time sync every 30 minutes
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-slate-500">
              Stay tuned for updates in future releases. This integration will make tracking your 
              nutrition effortless.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Utensils className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              MyFitnessPal
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Sync your food diary and nutrition data
            </p>
          </div>
        </div>
        
        {status?.connected ? (
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">Connected</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
              Not Connected
            </span>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Connection Status */}
      {!status?.connected ? (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-slate-100">
            Connect MyFitnessPal
          </h4>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Connect your MyFitnessPal account to automatically sync your food diary, 
            nutrition data, and meal information.
          </p>
          <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-2">
            <li>• Automatic food log synchronization</li>
            <li>• Nutrition tracking (calories, carbs, protein, fat)</li>
            <li>• Meal timing and portion sizes</li>
            <li>• Water intake tracking</li>
          </ul>
          <button
            onClick={handleConnect}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Connect MyFitnessPal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sync Controls */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100">
                  Food Diary Sync
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {status.settings?.last_sync_at 
                    ? `Last synced: ${new Date(status.settings.last_sync_at).toLocaleString()}`
                    : 'Never synced'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                  Automatically syncs your food logs, meals, and nutrition data
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>

            {/* Sync Settings */}
            {status.settings && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div>
                  <span className="text-sm text-gray-600 dark:text-slate-400">Food Logs</span>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {status.settings.sync_food_logs ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-slate-400">Water Intake</span>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {status.settings.sync_water_intake ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-slate-400">Auto Sync</span>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {status.settings.auto_sync_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-slate-400">Frequency</span>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    Every {status.settings.sync_frequency_minutes} min
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Syncs */}
          {status.recentSyncs && status.recentSyncs.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-4">
                Recent Syncs
              </h4>
              <div className="space-y-2">
                {status.recentSyncs.map((sync, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      {sync.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-gray-900 dark:text-slate-100">
                        {sync.operation.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-slate-400">
                      {sync.records_processed} records • {new Date(sync.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disconnect */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleDisconnect}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Disconnect MyFitnessPal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
