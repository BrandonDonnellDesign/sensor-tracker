'use client';

import { useState, useEffect } from 'react';
import { useDexcomTokenRefresh } from '@/hooks/use-dexcom-token-refresh';
import { authenticatedFetch } from '@/lib/api-client';
import { 
  TestTube, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Server,
  Monitor
} from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

export function DexcomAutoRefreshTester() {
  const {
    tokenInfo,
    isRefreshing,
    timeUntilExpiration,
    tokenStatus,
    autoRefresh
  } = useDexcomTokenRefresh();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState<string[]>([]);

  // Monitor auto-refresh activity
  useEffect(() => {
    const interval = setInterval(async () => {
      if (tokenInfo) {
        const now = new Date();
        const expiresAt = new Date(tokenInfo.token_expires_at);
        const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilExpiration <= 1.5 && hoursUntilExpiration > 0) {
          addLog(`Auto-refresh window active: ${hoursUntilExpiration.toFixed(2)} hours until expiration`);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [tokenInfo]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAutoRefreshLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev.slice(0, 4)]);
  };

  const runTokenStatusTest = async () => {
    setIsRunningTest(true);
    try {
      const response = await authenticatedFetch('/api/dexcom/test-auto-refresh');
      const data = await response.json();
      
      if (response.ok) {
        addTestResult({
          success: true,
          message: 'Token status check completed',
          data
        });
      } else {
        addTestResult({
          success: false,
          message: data.error || 'Token status check failed'
        });
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  const simulateExpiringToken = async () => {
    setIsRunningTest(true);
    try {
      const response = await authenticatedFetch('/api/dexcom/test-auto-refresh', {
        method: 'POST',
        body: JSON.stringify({ action: 'simulate-expiring' })
      });
      const data = await response.json();
      
      if (response.ok) {
        addTestResult({
          success: true,
          message: 'Token expiration simulated - auto-refresh should trigger soon',
          data
        });
        addLog('Simulated token expiring in 1 hour - monitoring for auto-refresh');
      } else {
        addTestResult({
          success: false,
          message: data.error || 'Failed to simulate expiring token'
        });
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  const triggerServerRefresh = async () => {
    setIsRunningTest(true);
    try {
      const response = await authenticatedFetch('/api/dexcom/test-auto-refresh', {
        method: 'POST',
        body: JSON.stringify({ action: 'trigger-server-refresh' })
      });
      const data = await response.json();
      
      addTestResult({
        success: data.success,
        message: data.message,
        data: data.serverResponse
      });
      
      if (data.success) {
        addLog('Server auto-refresh triggered manually');
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: `Server trigger failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  const triggerClientRefresh = async () => {
    addLog('Triggering client-side auto-refresh...');
    await autoRefresh();
    addLog('Client-side auto-refresh completed');
  };

  if (!tokenInfo) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="text-center">
          <TestTube className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-slate-400">
            No Dexcom token found. Connect your Dexcom account to test auto-refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
          <TestTube className="w-5 h-5 mr-2" />
          Auto-Refresh Testing Dashboard
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Token Status</span>
            </div>
            <p className="text-lg font-semibold capitalize">{tokenStatus}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {timeUntilExpiration ? `Expires in ${timeUntilExpiration}` : 'No expiration info'}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Monitor className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Client Refresh</span>
            </div>
            <p className="text-lg font-semibold">Every 30min</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {tokenStatus === 'expiring' ? 'Active' : 'Monitoring'}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Server className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Server Refresh</span>
            </div>
            <p className="text-lg font-semibold">Every 2hrs</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Batch processing
            </p>
          </div>
        </div>

        {/* Test Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={runTokenStatusTest}
            disabled={isRunningTest}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>Check Status</span>
          </button>
          
          <button
            onClick={simulateExpiringToken}
            disabled={isRunningTest}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white rounded-lg font-medium transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Simulate Expiring</span>
          </button>
          
          <button
            onClick={triggerClientRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
          >
            <Monitor className="w-4 h-4" />
            <span>Test Client Refresh</span>
          </button>
          
          <button
            onClick={triggerServerRefresh}
            disabled={isRunningTest}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors"
          >
            <Server className="w-4 h-4" />
            <span>Test Server Refresh</span>
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Test Results
          </h4>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{result.message}</span>
                </div>
                {result.data && (
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-slate-700 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Refresh Logs */}
      {autoRefreshLogs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Auto-Refresh Activity Log
          </h4>
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 max-h-48 overflow-y-auto">
            {autoRefreshLogs.map((log, index) => (
              <div key={index} className="text-sm font-mono text-gray-700 dark:text-slate-300 mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}