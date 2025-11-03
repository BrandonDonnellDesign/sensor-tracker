'use client';

import { useState } from 'react';
import { useDexcomTokenRefresh } from '@/hooks/use-dexcom-token-refresh';
import { 
  Shield, 
  ShieldAlert, 
  ShieldX, 
  RefreshCw, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';

interface DexcomTokenStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function DexcomTokenStatus({ className = '', showDetails = true }: DexcomTokenStatusProps) {
  const {
    tokenInfo,
    isRefreshing,
    lastRefresh,
    refreshError,
    refreshToken,
    needsRefresh,
    timeUntilExpiration,
    tokenStatus
  } = useDexcomTokenRefresh();

  const [showRefreshDetails, setShowRefreshDetails] = useState(false);

  const handleManualRefresh = async () => {
    const result = await refreshToken(true); // Force refresh
    if (result.success) {
      setShowRefreshDetails(true);
      setTimeout(() => setShowRefreshDetails(false), 3000);
    }
  };

  const getStatusIcon = () => {
    switch (tokenStatus) {
      case 'active':
        return <Shield className="w-5 h-5 text-green-500" />;
      case 'expiring':
        return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
      case 'expired':
        return <ShieldX className="w-5 h-5 text-red-500" />;
      case 'inactive':
        return <XCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Shield className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (tokenStatus) {
      case 'active':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'expiring':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'expired':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      case 'inactive':
        return 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50';
      default:
        return 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800';
    }
  };

  const getStatusText = () => {
    switch (tokenStatus) {
      case 'active':
        return 'Active';
      case 'expiring':
        return 'Expiring Soon';
      case 'expired':
        return 'Expired';
      case 'inactive':
        return 'Not Connected';
      default:
        return 'Unknown';
    }
  };

  if (!tokenInfo && tokenStatus === 'inactive') {
    return (
      <div className={`border rounded-lg p-4 ${getStatusColor()} ${className}`}>
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100">
              Dexcom Not Connected
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Connect your Dexcom account to enable automatic data sync
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-medium text-gray-900 dark:text-slate-100">
                Dexcom API Token: {getStatusText()}
              </p>
              {needsRefresh && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                  Needs Refresh
                </span>
              )}
            </div>
            
            {showDetails && (
              <div className="mt-1 space-y-1">
                {timeUntilExpiration && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      {tokenStatus === 'expired' ? 'Expired' : `Expires in ${timeUntilExpiration}`}
                    </span>
                  </div>
                )}
                
                {lastRefresh && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-slate-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>Last refreshed: {lastRefresh.toLocaleString()}</span>
                  </div>
                )}
                
                {refreshError && (
                  <div className="flex items-center space-x-1 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{refreshError}</span>
                  </div>
                )}
                
                {showRefreshDetails && (
                  <div className="flex items-center space-x-1 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>Token refreshed successfully!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {tokenInfo && (
          <div className="flex items-center space-x-2">
            {(needsRefresh || tokenStatus === 'expiring') && (
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm font-medium transition-colors"
              >
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Now'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      {tokenStatus === 'active' && !needsRefresh && (
        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-300">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Auto-refresh enabled - token will refresh automatically before expiration</span>
          </div>
        </div>
      )}
    </div>
  );
}