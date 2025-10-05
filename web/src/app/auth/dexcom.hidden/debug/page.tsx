'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, RefreshCw, Bug } from 'lucide-react';

export default function DexcomCallbackDebugPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'debug'>('loading');
  const [message, setMessage] = useState('Processing Dexcom authorization...');
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        // Collect debug information
        const storedState = localStorage.getItem('dexcom_oauth_state');
        const debug = {
          receivedCode: code ? 'present' : 'missing',
          receivedState: state || 'missing',
          storedState: storedState || 'missing',
          receivedError: error || 'none',
          stateMatch: storedState && state ? (storedState === state) : false,
          url: window.location.href
        };
        
        setDebugInfo(debug);
        console.log('OAuth Callback Debug Info:', debug);

        // Check for OAuth errors
        if (error) {
          throw new Error(`Dexcom authorization failed: ${error}`);
        }

        if (!code) {
          throw new Error('Missing authorization code');
        }

        if (!state) {
          setStatus('debug');
          setMessage('Missing state parameter - showing debug info');
          return;
        }

        // For now, skip state validation and show success
        if (!storedState) {
          console.warn('No stored state found, but continuing...');
        } else if (storedState !== state) {
          console.warn('State mismatch, but continuing for debugging...');
        }

        // Clean up stored state
        localStorage.removeItem('dexcom_oauth_state');

        // For now, just show success without calling Edge Function
        setStatus('success');
        setMessage('OAuth flow completed! (Debug mode - not calling Edge Function yet)');

        // Redirect back to settings after a delay
        setTimeout(() => {
          router.push('/dashboard/settings?tab=integrations&debug=oauth_success');
        }, 3000);

      } catch (err) {
        console.error('Dexcom callback error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Status Icon */}
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
            )}
            {status === 'success' && (
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            )}
            {status === 'debug' && (
              <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
                <Bug className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {status === 'loading' && 'Processing OAuth Callback'}
            {status === 'success' && 'OAuth Success! (Debug Mode)'}
            {status === 'error' && 'OAuth Failed'}
            {status === 'debug' && 'OAuth Debug Information'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            {message}
          </p>

          {/* Debug Information */}
          {Object.keys(debugInfo).length > 0 && (
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Debug Information:</h3>
              <div className="space-y-2 text-sm font-mono">
                {Object.entries(debugInfo).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">{key}:</span>
                    <span className={`${
                      key === 'stateMatch' 
                        ? (value ? 'text-green-600' : 'text-red-600') 
                        : 'text-gray-900 dark:text-slate-100'
                    }`}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {(status === 'error' || status === 'debug') && (
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/settings?tab=integrations')}
                className="w-full btn-primary"
              >
                Back to Settings
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full btn-secondary"
              >
                Retry
              </button>
            </div>
          )}

          {status === 'success' && (
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Redirecting to settings in a moment...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}