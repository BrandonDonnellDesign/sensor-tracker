import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';

interface DexcomConnectionStatus {
  connected: boolean;
  lastSync?: string;
  error?: string;
  tokenExpiry?: string;
  source?: string;
}

interface SyncSettings {
  auto_sync_enabled: boolean;
  sync_frequency_minutes: number;
  sync_sensor_data: boolean;
  sync_glucose_data: boolean;
  sync_device_status: boolean;
}

export function DexcomIntegrationSettings() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<DexcomConnectionStatus>({ connected: false });
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    auto_sync_enabled: true,
    sync_frequency_minutes: 60,
    sync_sensor_data: true,
    sync_glucose_data: false,
    sync_device_status: true,
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnectionStatus = useCallback(async () => {
    try {
      // First, check database for stored tokens via our API route
      if (user?.id) {
        try {
          const response = await fetch('/api/dexcom/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'checkConnection', userId: user.id })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.connected) {
              setConnectionStatus({
                connected: true,
                lastSync: localStorage.getItem('dexcom_last_sync') || undefined,
                tokenExpiry: data.tokenExpiry
              });
              return;
            }
          }
        } catch (dbError) {
          console.warn('Database connection check failed:', dbError);
        }
      }

      // Fallback to localStorage check
      const oauthCompleted = localStorage.getItem('dexcom_oauth_completed');
      if (oauthCompleted) {
        setConnectionStatus({ 
          connected: true, 
          lastSync: localStorage.getItem('dexcom_last_sync') || undefined,
          source: 'localStorage'
        });
        return;
      }

      // No connection found
      setConnectionStatus({ connected: false });
      
    } catch (err) {
      console.error('Error checking Dexcom connection:', err);
      
      // Final fallback to localStorage
      const localConnection = localStorage.getItem('dexcom_oauth_completed');
      setConnectionStatus({ 
        connected: !!localConnection,
        lastSync: localStorage.getItem('dexcom_last_sync') || undefined,
        error: 'Connection check failed (using local storage)' 
      });
    }
  }, [user]);

  const loadSyncSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dexcom_sync_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        throw error;
      }

      if (data) {
        setSyncSettings(data);
      }
    } catch (err) {
      console.error('Error loading sync settings:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkConnectionStatus();
      loadSyncSettings();
    }
  }, [user, checkConnectionStatus, loadSyncSettings]);

  const connectToDexcom = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get authorization URL from API route
      const response = await fetch('/api/dexcom/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get auth URL: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.authUrl || !data.state) {
        throw new Error('Invalid response from auth URL endpoint');
      }

      console.log('OAuth state generated:', data.state);

      // Store state for OAuth flow
      localStorage.setItem('dexcom_oauth_state', data.state);
      
      // Verify state was stored
      const storedState = localStorage.getItem('dexcom_oauth_state');
      console.log('State stored in localStorage:', storedState);
      
      // Redirect to Dexcom authorization
      console.log('Redirecting to:', data.authUrl);
      window.location.href = data.authUrl;
    } catch (err) {
      console.error('Error connecting to Dexcom:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Dexcom');
    } finally {
      setLoading(false);
    }
  };

  const disconnectFromDexcom = async () => {
    setLoading(true);
    setError(null);

    try {
      // Revoke tokens via Supabase Edge Function
      const { error } = await supabase.functions.invoke('dexcom-oauth', {
        body: { action: 'revokeTokens', userId: user!.id }
      });

      if (error) throw error;

      // Clear localStorage flags
      localStorage.removeItem('dexcom_oauth_completed');
      localStorage.removeItem('dexcom_connected_at');
      localStorage.removeItem('dexcom_last_sync');

      setConnectionStatus({ connected: false });
      setError(null);
    } catch (err) {
      console.error('Error disconnecting from Dexcom:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect from Dexcom');
    } finally {
      setLoading(false);
    }
  };

  const triggerManualSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      // Use Next.js API route for manual sync
      const response = await fetch('/api/dexcom/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'triggerSync', userId: user!.id })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle token expiry
        if (errorData.needsReauth) {
          setError(errorData.error || 'Dexcom tokens expired. Please reconnect your account.');
          // Clear localStorage to show reconnect option
          localStorage.removeItem('dexcom_oauth_completed');
          setConnectionStatus({ connected: false });
          return;
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to trigger sync`);
      }

      const data = await response.json();

      // Show success message with details
      setError(null);
      localStorage.setItem('dexcom_last_sync', new Date().toISOString());
      checkConnectionStatus(); // Refresh status
      
      console.log('Sync completed:', data);
      
      // Show detailed success notification
      const results = data.results;
      let message = 'Sync completed successfully!';
      
      if (results) {
        const details = [];
        if (results.sensorsFound > 0) {
          details.push(`${results.sensorsFound} sensor(s) found`);
        }
        if (results.sensorsCreated > 0) {
          details.push(`${results.sensorsCreated} new sensor(s) added`);
        }
        if (results.sensorsUpdated > 0) {
          details.push(`${results.sensorsUpdated} sensor(s) updated`);
        }
        if (results.devicesFound > 0) {
          details.push(`${results.devicesFound} device(s) found`);
        }
        
        if (details.length > 0) {
          message += `\n\n${details.join('\n')}`;
        }
        
        if (results.errors && results.errors.length > 0) {
          message += `\n\nWarnings:\n${results.errors.join('\n')}`;
        }
      }
      
      alert(message);
      
    } catch (err) {
      console.error('Error syncing with Dexcom:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const updateSyncSettings = async (newSettings: Partial<SyncSettings>) => {
    try {
      const updatedSettings = { ...syncSettings, ...newSettings };
      
      const { error } = await supabase
        .from('dexcom_sync_settings')
        .upsert({
          user_id: user!.id,
          ...updatedSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSyncSettings(updatedSettings);
    } catch (err) {
      console.error('Error updating sync settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Dexcom Integration
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Automatically sync sensor data from your Dexcom account
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {connectionStatus.connected ? (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <Wifi className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <WifiOff className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {!connectionStatus.connected ? (
        <div className="text-center py-8">
          <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            Connect Your Dexcom Account
          </h4>
          <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Automatically import sensor data, get real-time sync, and never manually enter sensor information again.
          </p>
          <button
            onClick={connectToDexcom}
            disabled={loading}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span>{loading ? 'Connecting...' : 'Connect to Dexcom'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Manual Sync */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100">Manual Sync</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Manually sync your latest sensor data from Dexcom
              </p>
            </div>
            <button
              onClick={triggerManualSync}
              disabled={syncing}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Auto Sync Settings */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-4">
              Automatic Sync Settings
            </h4>
            
            <div className="space-y-4">
              {/* Enable Auto Sync */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-slate-300">
                  Enable automatic sync
                </label>
                <input
                  type="checkbox"
                  checked={syncSettings.auto_sync_enabled}
                  onChange={(e) => updateSyncSettings({ auto_sync_enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Sync Frequency */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-slate-300">
                  Sync frequency (minutes)
                </label>
                <select
                  value={syncSettings.sync_frequency_minutes}
                  onChange={(e) => updateSyncSettings({ sync_frequency_minutes: parseInt(e.target.value) })}
                  className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={360}>6 hours</option>
                </select>
              </div>

              {/* Data Types */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Sync data types:</p>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600 dark:text-slate-400">
                    Sensor information
                  </label>
                  <input
                    type="checkbox"
                    checked={syncSettings.sync_sensor_data}
                    onChange={(e) => updateSyncSettings({ sync_sensor_data: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600 dark:text-slate-400">
                    Device status & battery
                  </label>
                  <input
                    type="checkbox"
                    checked={syncSettings.sync_device_status}
                    onChange={(e) => updateSyncSettings({ sync_device_status: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600 dark:text-slate-400">
                    Glucose readings (future feature)
                  </label>
                  <input
                    type="checkbox"
                    checked={syncSettings.sync_glucose_data}
                    onChange={(e) => updateSyncSettings({ sync_glucose_data: e.target.checked })}
                    disabled
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Disconnect */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100">Disconnect</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Remove Dexcom integration and stop automatic syncing
                </p>
              </div>
              <button
                onClick={disconnectFromDexcom}
                disabled={loading}
                className="btn-danger"
              >
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
