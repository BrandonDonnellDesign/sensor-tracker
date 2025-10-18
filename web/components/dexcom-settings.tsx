'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ExternalLink, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { systemLogger } from '@/lib/system-logger';

interface DexcomConnection {
  id: string;
  token_expires_at: string;
  created_at: string;
}

interface SyncSettings {
  sync_frequency_minutes: number;
  auto_sync_enabled: boolean;
  last_successful_sync: string | null;
}

interface SyncLog {
  id: string;
  status: 'success' | 'error' | 'partial_success';
  operation: string;
  sync_type: string;
  created_at: string;
}

interface DexcomSettingsProps {
  user?: any;
}

export function DexcomSettings({ user }: DexcomSettingsProps) {
  const [connection, setConnection] = useState<DexcomConnection | null>(null);
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    console.log(`${variant === 'destructive' ? 'ERROR' : 'INFO'}: ${title} - ${description}`);
  };

  const loadDexcomData = useCallback(async () => {
    try {
      if (!user) return;
      
      const supabase = createClient();

      // Load connection status
      const { data: connectionData } = await supabase
        .from('dexcom_tokens')
        .select('id, token_expires_at, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      setConnection(connectionData as unknown as DexcomConnection);

      // Load sync settings
      const { data: settingsData } = await supabase
        .from('dexcom_sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setSyncSettings(settingsData as unknown as SyncSettings);

      // Load recent sync logs
      const { data: logsData } = await supabase
        .from('dexcom_sync_log')
        .select('id, status, operation, sync_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setSyncLogs((logsData as unknown as SyncLog[]) || []);

    } catch (error) {
      console.error('Error loading Dexcom data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDexcomData();
  }, [loadDexcomData]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (!user) {
        showToast("Authentication required", "Please log in to connect your Dexcom account.", "destructive");
        return;
      }

      await systemLogger.info('dexcom', 'User initiated Dexcom connection', user.id);

      // Redirect to Dexcom OAuth
      const clientId = process.env.NEXT_PUBLIC_DEXCOM_CLIENT_ID;
      const redirectUri = process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI || `${window.location.origin}/api/auth/dexcom/callback`;
      const state = user.id;
      
      const authUrl = `https://api.dexcom.com/v2/oauth2/login?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=offline_access&state=${state}`;
      
      console.log('Dexcom OAuth URL:', authUrl);
      console.log('Redirect URI:', redirectUri);
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating Dexcom connection:', error);
      await systemLogger.error('dexcom', `Failed to initiate connection: ${error instanceof Error ? error.message : 'Unknown error'}`, user?.id);
      showToast("Connection failed", "Failed to initiate Dexcom connection. Please try again.", "destructive");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!user) return;
      
      await systemLogger.info('dexcom', 'User initiated Dexcom disconnection', user.id);
      
      const supabase = createClient();

      await (supabase as any)
        .from('dexcom_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      setConnection(null);
      
      await systemLogger.info('dexcom', 'Dexcom account disconnected successfully', user.id);
      showToast("Disconnected", "Your Dexcom account has been disconnected.");
    } catch (error) {
      console.error('Error disconnecting Dexcom:', error);
      await systemLogger.error('dexcom', `Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`, user.id);
      showToast("Error", "Failed to disconnect Dexcom account.", "destructive");
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await systemLogger.info('dexcom', 'User initiated manual sync', user?.id);
      
      const response = await fetch('/api/dexcom/sync', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        await systemLogger.info('dexcom', 'Manual sync completed successfully', user?.id);
        showToast("Sync completed", result.message);
        loadDexcomData();
      } else {
        await systemLogger.error('dexcom', `Manual sync failed: ${result.error}`, user?.id);
        showToast("Sync failed", result.error || "Failed to sync with Dexcom.", "destructive");
      }
    } catch (error) {
      console.error('Error syncing with Dexcom:', error);
      await systemLogger.error('dexcom', `Manual sync error: ${error instanceof Error ? error.message : 'Unknown error'}`, user?.id);
      showToast("Sync failed", "Failed to sync with Dexcom. Please try again.", "destructive");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSyncSettings = async (updates: Partial<SyncSettings>) => {
    try {
      if (!user) return;
      
      const supabase = createClient();

      const { error } = await supabase
        .from('dexcom_sync_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setSyncSettings(prev => prev ? { ...prev, ...updates } : null);
      
      showToast("Settings updated", "Your sync settings have been saved.");
    } catch (error) {
      console.error('Error updating sync settings:', error);
      showToast("Error", "Failed to update sync settings.", "destructive");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partial_success':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Dexcom Integration
            </h3>
            {connection && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                Connected
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Connect your Dexcom account to automatically import sensor data and readings.
          </p>
        </div>
        <div className="p-6">
          {!connection ? (
            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                No Dexcom account connected. Connect your account to start importing sensor data automatically.
              </p>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Connect Dexcom Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Connected Account</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Connected on {new Date(connection.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Token expires: {new Date(connection.token_expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Sync Now
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Settings */}
      {connection && syncSettings && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Sync Settings</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Configure how often your Dexcom data is synchronized.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Enable automatic sync
              </label>
              <button
                onClick={() => updateSyncSettings({ auto_sync_enabled: !syncSettings.auto_sync_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  syncSettings.auto_sync_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    syncSettings.auto_sync_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Sync frequency
              </label>
              <select
                value={syncSettings.sync_frequency_minutes}
                onChange={(e) => updateSyncSettings({ sync_frequency_minutes: parseInt(e.target.value) })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
                <option value={180}>Every 3 hours</option>
                <option value={360}>Every 6 hours</option>
                <option value={720}>Every 12 hours</option>
                <option value={1440}>Daily</option>
              </select>
            </div>

            {syncSettings.last_successful_sync && (
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Last sync: {new Date(syncSettings.last_successful_sync).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sync History */}
      {syncLogs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Sync Activity</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              History of recent synchronization attempts with Dexcom.
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-600 rounded-lg">
                  {getStatusIcon(log.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {log.operation || `${log.sync_type} sync`}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">
                      {log.sync_type} • {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}