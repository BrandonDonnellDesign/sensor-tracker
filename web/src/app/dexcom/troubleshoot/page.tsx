'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Copy, ExternalLink } from 'lucide-react';

export default function DexcomTroubleshootPage() {
  const [config, setConfig] = useState<any>({});
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    // Get current configuration
    const getCurrentConfig = async () => {
      try {
        const response = await fetch('/api/dexcom/auth-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAuthUrl(data.authUrl);
        }
      } catch (err) {
        console.error('Failed to get auth URL:', err);
      }
    };

    getCurrentConfig();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Dexcom "Client Not Known" Error - Troubleshooting
            </h1>
          </div>

          {/* Current Configuration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Current Configuration
            </h2>
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm">Client ID:</span>
                <div className="flex items-center">
                  <span className="font-mono text-sm text-gray-900 dark:text-slate-100">
                    {process.env.NEXT_PUBLIC_DEXCOM_CLIENT_ID}
                  </span>
                  <button
                    onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_DEXCOM_CLIENT_ID || '')}
                    className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm">Redirect URI:</span>
                <div className="flex items-center">
                  <span className="font-mono text-sm text-gray-900 dark:text-slate-100 max-w-md truncate">
                    {process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI}
                  </span>
                  <button
                    onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI || '')}
                    className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm">Environment:</span>
                <span className="font-mono text-sm text-gray-900 dark:text-slate-100">
                  {process.env.NEXT_PUBLIC_DEXCOM_AUTH_BASE_URL?.includes('sandbox') ? '🧪 SANDBOX' : '🚀 PRODUCTION'}
                </span>
              </div>
            </div>
          </div>

          {/* Possible Causes */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Possible Causes & Solutions
            </h2>
            <div className="space-y-4">
              
              {/* Cause 1 */}
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">
                  1. Application Doesn't Exist in Dexcom Portal
                </h3>
                <p className="text-gray-600 dark:text-slate-400 mb-3">
                  The Client ID doesn't exist in your Dexcom Developer Portal account.
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Action Required:</p>
                  <ol className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>1. Go to <a href="https://developer.dexcom.com/" target="_blank" className="underline">Dexcom Developer Portal</a></li>
                    <li>2. Sign in to your developer account</li>
                    <li>3. Check if you have any applications in "My Apps"</li>
                    <li>4. If none exist, create a new application with the settings below</li>
                  </ol>
                </div>
              </div>

              {/* Cause 2 */}
              <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
                  2. Application Needs Activation
                </h3>
                <p className="text-gray-600 dark:text-slate-400 mb-3">
                  Your application exists but is pending approval by Dexcom.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Action Required:</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Contact Dexcom Developer Support at: 
                    <a href="mailto:developersupport@dexcom.com" className="underline ml-1">
                      developersupport@dexcom.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Cause 3 */}
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  3. Redirect URI Mismatch
                </h3>
                <p className="text-gray-600 dark:text-slate-400 mb-3">
                  The redirect URI in Dexcom portal doesn't match your current configuration.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Update Portal With:</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm bg-white dark:bg-slate-700 p-2 rounded font-mono">
                      {process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI}
                    </code>
                    <button
                      onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI || '')}
                      className="ml-2 btn-secondary p-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Required Settings */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Required Dexcom Application Settings
            </h2>
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4">
              <table className="w-full text-sm">
                <tbody className="space-y-2">
                  <tr>
                    <td className="font-medium py-2">Application Name:</td>
                    <td className="py-2">CGM Tracker (or your choice)</td>
                  </tr>
                  <tr>
                    <td className="font-medium py-2">Application Type:</td>
                    <td className="py-2">Server-side Web Application</td>
                  </tr>
                  <tr>
                    <td className="font-medium py-2">Client ID:</td>
                    <td className="py-2 font-mono">{process.env.NEXT_PUBLIC_DEXCOM_CLIENT_ID}</td>
                  </tr>
                  <tr>
                    <td className="font-medium py-2">Redirect URI:</td>
                    <td className="py-2 font-mono break-all">{process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI}</td>
                  </tr>
                  <tr>
                    <td className="font-medium py-2">Scopes:</td>
                    <td className="py-2">offline_access</td>
                  </tr>
                  <tr>
                    <td className="font-medium py-2">Status:</td>
                    <td className="py-2">Active/Approved</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Test URL */}
          {authUrl && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                Test OAuth URL
              </h2>
              <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                  This is the URL that should work once your Dexcom application is properly configured:
                </p>
                <div className="flex items-center justify-between">
                  <code className="text-xs bg-white dark:bg-slate-800 p-2 rounded font-mono flex-1 mr-2 break-all">
                    {authUrl}
                  </code>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(authUrl)}
                      className="btn-secondary p-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary p-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Items */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Next Steps
            </h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-300">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Check Dexcom Developer Portal</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Verify your application exists and matches the configuration above
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-300">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Update Configuration</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    If needed, update your .env.local with the correct Client ID and Secret
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-300">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Test OAuth Flow</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Use the test URL above or go back to Settings &gt; Integrations
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/dashboard/settings?tab=integrations"
              className="btn-primary"
            >
              Back to Integration Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}