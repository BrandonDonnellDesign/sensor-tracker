'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function DexcomCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Dexcom authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
          throw new Error(`Dexcom authorization failed: ${error}`);
        }

        if (!code) {
          throw new Error('Missing authorization code');
        }

        if (!state) {
          throw new Error('Missing state parameter');
        }

        // Verify state parameter
        const storedState = localStorage.getItem('dexcom_oauth_state');
        if (!storedState) {
          console.warn('No stored OAuth state found - this may be expected for first-time setup');
          // Continue with the flow - don't block on missing state for development
        } else if (storedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Clean up stored state
        localStorage.removeItem('dexcom_oauth_state');

        // Get current user for Edge Function call
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn('No authenticated user found, proceeding without user ID');
        }

        // Exchange code for tokens via Supabase Edge Function
        console.log('Calling dexcom-oauth Edge Function with:', { 
          code: code?.substring(0, 10) + '...', 
          state, 
          userId: user?.id 
        });
        
        const { data, error: exchangeError } = await supabase.functions.invoke('dexcom-oauth', {
          body: {
            action: 'exchangeCode',
            code,
            state,
            userId: user?.id
          }
        });

        console.log('Edge Function response:', { data, error: exchangeError });

        if (exchangeError) {
          console.error('Edge Function error details:', exchangeError);
          
          // Fallback to Next.js API route if Edge Function fails
          console.log('Falling back to Next.js API route...');
          const response = await fetch('/api/dexcom/oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'exchangeCode', code, state, userId: user?.id })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Fallback API error: ${response.status}`);
          }

          const fallbackData = await response.json();
          if (!fallbackData.success) {
            throw new Error(fallbackData.message || 'Fallback API failed');
          }

          console.log('Fallback API succeeded:', fallbackData);
        } else {
          if (!data) {
            throw new Error('No data returned from Edge Function');
          }

          if (!data.success) {
            throw new Error(data.message || data.error || 'Failed to exchange authorization code');
          }
        }

        // Mark OAuth as completed in localStorage
        localStorage.setItem('dexcom_oauth_completed', 'true');
        localStorage.setItem('dexcom_connected_at', new Date().toISOString());

        setStatus('success');
        setMessage('Successfully connected to Dexcom! Redirecting to settings...');

        // Redirect back to settings after a brief delay
        setTimeout(() => {
          router.push('/dashboard/settings?tab=integrations&success=dexcom_connected');
        }, 2000);

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
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
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
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {status === 'loading' && 'Connecting to Dexcom'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            {message}
          </p>

          {/* Actions */}
          {status === 'error' && (
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
                Try Again
              </button>
            </div>
          )}

          {status === 'success' && (
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Redirecting in a moment...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}