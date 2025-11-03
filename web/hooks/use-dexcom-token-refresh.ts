'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { authenticatedFetch } from '@/lib/api-client';

interface DexcomToken {
  id: string;
  user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  is_active: boolean;
  scope: string;
  last_sync_at?: string;
}

interface TokenRefreshResult {
  success: boolean;
  message: string;
  expires_at?: string;
  error?: string;
}

export function useDexcomTokenRefresh() {
  const { user } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<DexcomToken | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Check token expiration status
  const checkTokenExpiration = useCallback(async () => {
    if (!user) return null;

    try {
      const response = await authenticatedFetch('/api/dexcom/token-status');
      if (response.ok) {
        const data = await response.json();
        setTokenInfo(data.token);
        return data.token;
      }
    } catch (error) {
      console.error('Error checking token status:', error);
    }
    return null;
  }, [user]);

  // Refresh the token
  const refreshToken = useCallback(async (force = false): Promise<TokenRefreshResult> => {
    if (!user || isRefreshing) {
      return { success: false, message: 'Cannot refresh token at this time' };
    }

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await authenticatedFetch('/api/dexcom/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ force })
      });

      const result = await response.json();

      if (result.success) {
        setLastRefresh(new Date());
        // Update token info
        await checkTokenExpiration();
      } else {
        setRefreshError(result.error || 'Failed to refresh token');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setRefreshError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsRefreshing(false);
    }
  }, [user, isRefreshing, checkTokenExpiration]);

  // Check if token needs refresh (expires within 90 minutes)
  const needsRefresh = useCallback((token: DexcomToken | null): boolean => {
    if (!token || !token.is_active) return false;
    
    const expiresAt = new Date(token.token_expires_at);
    const ninetyMinutesFromNow = new Date();
    ninetyMinutesFromNow.setMinutes(ninetyMinutesFromNow.getMinutes() + 90);
    
    return expiresAt <= ninetyMinutesFromNow;
  }, []);

  // Auto-refresh logic
  const autoRefresh = useCallback(async () => {
    const token = await checkTokenExpiration();
    
    if (token && needsRefresh(token)) {
      console.log('Token expires soon, auto-refreshing...');
      const result = await refreshToken();
      
      if (result.success) {
        console.log('Token auto-refreshed successfully');
      } else {
        console.error('Auto-refresh failed:', result.message);
      }
    }
  }, [checkTokenExpiration, needsRefresh, refreshToken]);

  // Set up periodic checks
  useEffect(() => {
    if (!user) return;

    // Initial check
    checkTokenExpiration();

    // Check every 10 minutes (tokens only last 2 hours)
    const interval = setInterval(() => {
      autoRefresh();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [user, autoRefresh, checkTokenExpiration]);

  // Check on page focus (when user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        autoRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, autoRefresh]);

  // Get time until expiration
  const getTimeUntilExpiration = useCallback((): string | null => {
    if (!tokenInfo || !tokenInfo.is_active) return null;

    const expiresAt = new Date(tokenInfo.token_expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }, [tokenInfo]);

  // Get token status
  const getTokenStatus = useCallback((): 'active' | 'expiring' | 'expired' | 'inactive' => {
    if (!tokenInfo || !tokenInfo.is_active) return 'inactive';

    const expiresAt = new Date(tokenInfo.token_expires_at);
    const now = new Date();

    if (expiresAt <= now) return 'expired';
    if (needsRefresh(tokenInfo)) return 'expiring';
    return 'active';
  }, [tokenInfo, needsRefresh]);

  return {
    tokenInfo,
    isRefreshing,
    lastRefresh,
    refreshError,
    refreshToken,
    checkTokenExpiration,
    needsRefresh: tokenInfo ? needsRefresh(tokenInfo) : false,
    timeUntilExpiration: getTimeUntilExpiration(),
    tokenStatus: getTokenStatus(),
    autoRefresh
  };
}