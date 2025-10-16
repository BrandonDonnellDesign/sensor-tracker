'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

interface FreestyleConnection {
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

interface FreestyleSettingsProps {
  user?: any;
}

export function FreestyleSettings({ user }: FreestyleSettingsProps) {
  const [connection, setConnection] = useState<FreestyleConnection | null>(
    null
  );
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const showToast = (
    title: string,
    description: string,
    variant: 'default' | 'destructive' = 'default'
  ) => {
    console.log(
      `${
        variant === 'destructive' ? 'ERROR' : 'INFO'
      }: ${title} - ${description}`
    );
  };

  const loadFreestyleData = useCallback(async () => {
    try {
      if (!user) return;

      const supabase = createClient();

      // Load connection status
      const { data: connectionData } = await (supabase as any)
        .from('freestyle_tokens')
        .select('id, token_expires_at, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      setConnection(connectionData as unknown as FreestyleConnection);

      // Load sync settings
      const { data: settingsData } = await (supabase as any)
        .from('freestyle_sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setSyncSettings(settingsData as unknown as SyncSettings);

      // Load recent sync logs
      const { data: logsData } = await (supabase as any)
        .from('freestyle_sync_log')
        .select('id, status, operation, sync_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setSyncLogs((logsData as unknown as SyncLog[]) || []);
    } catch (error) {
      console.error('Error loading Freestyle data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFreestyleData();
  }, [loadFreestyleData]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (!user) {
        showToast(
          'Authentication required',
          'Please log in to connect your Freestyle Libre account.',
          'destructive'
        );
        return;
      }

      // Note: Freestyle Libre doesn't have a public OAuth API like Dexcom
      // This is a placeholder for when/if they provide one
      showToast(
        'Coming Soon',
        'Freestyle Libre API integration is in development.',
        'default'
      );
    } catch (error) {
      console.error('Error initiating Freestyle connection:', error);
      showToast(
        'Connection failed',
        'Failed to initiate Freestyle connection. Please try again.',
        'destructive'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!user) return;

      const supabase = createClient();

      await (supabase as any)
        .from('freestyle_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      setConnection(null);

      showToast(
        'Disconnected',
        'Your Freestyle Libre account has been disconnected.'
      );
    } catch (error) {
      console.error('Error disconnecting Freestyle:', error);
      showToast(
        'Error',
        'Failed to disconnect Freestyle account.',
        'destructive'
      );
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/freestyle/sync', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Sync completed', result.message);
        loadFreestyleData();
      } else {
        showToast(
          'Sync failed',
          result.error || 'Failed to sync with Freestyle Libre.',
          'destructive'
        );
      }
    } catch (error) {
      console.error('Error syncing with Freestyle:', error);
      showToast(
        'Sync failed',
        'Failed to sync with Freestyle Libre. Please try again.',
        'destructive'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSyncSettings = async (updates: Partial<SyncSettings>) => {
    try {
      if (!user) return;

      const supabase = createClient();

      const { error } = await (supabase as any)
        .from('freestyle_sync_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setSyncSettings((prev) => (prev ? { ...prev, ...updates } : null));

      showToast('Settings updated', 'Your sync settings have been saved.');
    } catch (error) {
      console.error('Error updating sync settings:', error);
      showToast('Error', 'Failed to update sync settings.', 'destructive');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'error':
        return <XCircle className='h-4 w-4 text-red-500' />;
      case 'partial_success':
        return <AlertCircle className='h-4 w-4 text-yellow-500' />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className='bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6'>
        <div className='flex items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin' />
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Connection Status */}
      <div className='bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700'>
        <div className='p-6 border-b border-gray-200 dark:border-slate-700'>
          <div className='flex items-center gap-2'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              Freestyle Libre Integration
            </h3>
            {connection && (
              <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'>
                Connected
              </span>
            )}
          </div>
          <p className='text-sm text-gray-600 dark:text-slate-400 mt-1'>
            Connect your Freestyle Libre account to automatically import sensor
            data and readings.
          </p>
        </div>
        <div className='p-6'>
          <div className='text-center py-6'>
            <div className='mb-4'>
              <div className='w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
                <AlertCircle className='w-8 h-8 text-yellow-600 dark:text-yellow-400' />
              </div>
              <h4 className='text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2'>
                Integration In Development
              </h4>
              <p className='text-gray-600 dark:text-slate-400 mb-4'>
                Freestyle Libre API integration is currently being developed.
                Abbott does not provide a public OAuth API like Dexcom, so
                we&apos;re exploring alternative integration methods.
              </p>
              <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left'>
                <h5 className='font-medium text-blue-900 dark:text-blue-100 mb-2'>
                  Planned Features:
                </h5>
                <ul className='text-sm text-blue-800 dark:text-blue-200 space-y-1'>
                  <li>• LibreView data export/import</li>
                  <li>• Manual CSV upload support</li>
                  <li>• Sensor change detection</li>
                  <li>• Historical data analysis</li>
                </ul>
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={true}
              className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-400 cursor-not-allowed opacity-50'>
              <ExternalLink className='mr-2 h-4 w-4' />
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Future sync settings and history would go here */}
    </div>
  );
}
