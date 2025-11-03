'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Activity,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';

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

export function DexcomSettings({ user: _user }: DexcomSettingsProps) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<DexcomConnection | null>(null);
  const [_syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const [_syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const showToast = (
    _title: string,
    _description: string,
    _variant: 'default' | 'destructive' = 'default'
  ) => {
    // Toast notification placeholder
  };

  const loadDexcomData = useCallback(async () => {
    try {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const userId = user.id;

      const supabase = createClient();
      const { data: connectionData, error: connectionError } = await (supabase as any)
        .from('dexcom_tokens')
        .select('id, token_expires_at, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (connectionError && connectionError.code !== 'PGRST116') {
        setConnection(null);
        setSyncSettings(null);
        setSyncLogs([]);
        setIsLoading(false);
        return;
      }

      setConnection(connectionData as unknown as DexcomConnection);

      const { data: settingsData } = await (supabase as any)
        .from('dexcom_sync_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      setSyncSettings(settingsData as unknown as SyncSettings);

      const { data: logsData } = await (supabase as any)
        .from('dexcom_sync_log')
        .select('id, status, operation, sync_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setSyncLogs((logsData as unknown as SyncLog[]) || []);
    } catch (error) {
      setConnection(null);
      setSyncSettings(null);
      setSyncLogs([]);
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
        showToast(
          'Authentication required',
          'Please log in to connect your Dexcom account.',
          'destructive'
        );
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_DEXCOM_CLIENT_ID;
      const redirectUri =
        process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI ||
        `${window.location.origin}/api/auth/dexcom/callback`;
      const state = user.id;

      const authUrl = `https://api.dexcom.com/v2/oauth2/login?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=offline_access&state=${state}`;

      window.location.href = authUrl;
    } catch (error) {
      showToast(
        'Connection failed',
        'Failed to initiate Dexcom connection. Please try again.',
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
        .from('dexcom_tokens')
        .update({ is_active: false } as any)
        .eq('user_id', user.id);

      setConnection(null);
      showToast('Disconnected', 'Your Dexcom account has been disconnected.');
    } catch (error) {
      showToast('Error', 'Failed to disconnect Dexcom account.', 'destructive');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (!user) {
        showToast('Error', 'User not authenticated', 'destructive');
        setIsSyncing(false);
        return;
      }

      const response = await fetch('/api/dexcom/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Sync completed', result.message);
        loadDexcomData();
      } else {
        showToast(
          'Sync failed',
          result.error || 'Failed to sync with Dexcom.',
          'destructive'
        );
      }
    } catch (error) {
      showToast(
        'Sync failed',
        'Failed to sync with Dexcom. Please try again.',
        'destructive'
      );
    } finally {
      setIsSyncing(false);
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
    <div className='bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6'>
      <div className='text-center mb-6'>
        <div className='relative inline-flex items-center justify-center mb-4'>
          <div className='w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center'>
            <Activity className='w-6 h-6 text-blue-500' />
          </div>
          {connection && (
            <div className='absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center'>
              <CheckCircle className='w-2.5 h-2.5 text-white' />
            </div>
          )}
        </div>
        <h3 className='text-xl font-bold text-gray-900 dark:text-slate-100 mb-3'>
          Dexcom Integration
        </h3>
        {connection ? (
          <div className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 mb-4'>
            <CheckCircle className='w-3 h-3 mr-1' />
            Connected
          </div>
        ) : (
          <div className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 mb-4'>
            <Zap className='w-3 h-3 mr-1' />
            Available Now
          </div>
        )}
      </div>

      <div className='text-center mb-6'>
        <p className='text-gray-600 dark:text-slate-400 text-sm leading-relaxed'>
          Connect your Dexcom account for automatic glucose data synchronization
          and real-time monitoring.
        </p>
      </div>

      <div className='space-y-2 mb-6'>
        {[
          'Automatic sensor detection',
          'Real-time sync with Dexcom',
          'Device status monitoring',
          'Historical data import',
        ].map((feature, index) => (
          <div
            key={index}
            className='flex items-center text-gray-600 dark:text-slate-400 text-sm'>
            <div className='w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0'></div>
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {!connection ? (
        <div className='text-center'>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className='inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors'>
            {isConnecting ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <ExternalLink className='mr-2 h-4 w-4' />
            )}
            Connect Dexcom Account
          </button>
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='text-center'>
            <p className='text-sm text-gray-600 dark:text-slate-400 mb-1'>
              Connected on{' '}
              {new Date(connection.created_at).toLocaleDateString()}
            </p>
            <p className='text-xs text-gray-500 dark:text-slate-500'>
              Token expires:{' '}
              {new Date(connection.token_expires_at).toLocaleDateString()}
            </p>
          </div>
          <div className='flex gap-2 justify-center'>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className='inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-lg text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors'>
              {isSyncing ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='mr-2 h-4 w-4' />
              )}
              Sync Now
            </button>
            <button
              onClick={handleDisconnect}
              className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors'>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
