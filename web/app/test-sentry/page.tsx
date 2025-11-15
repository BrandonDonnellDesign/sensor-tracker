'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Bug, AlertTriangle } from 'lucide-react';

export default function TestSentryPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSentryMessage = () => {
    try {
      Sentry.captureMessage('🧪 Test message from CGM Tracker', 'info');
      addResult('✅ Sent test message to Sentry');
      logger.info('Test message sent to Sentry');
    } catch (error) {
      addResult('❌ Failed to send message: ' + error);
    }
  };

  const testSentryError = () => {
    try {
      const testError = new Error('🧪 Test error from CGM Tracker');
      Sentry.captureException(testError);
      addResult('✅ Sent test error to Sentry');
      logger.error('Test error sent to Sentry', testError);
    } catch (error) {
      addResult('❌ Failed to send error: ' + error);
    }
  };

  const testLoggerError = () => {
    try {
      logger.error('🧪 Test error via logger', new Error('This should appear in Sentry'));
      addResult('✅ Sent error via logger (should appear in Sentry)');
    } catch (error) {
      addResult('❌ Failed to send via logger: ' + error);
    }
  };

  const testLoggerWarning = () => {
    try {
      logger.warn('🧪 Test warning via logger', { context: 'test data' });
      addResult('✅ Sent warning via logger (should appear in Sentry)');
    } catch (error) {
      addResult('❌ Failed to send warning: ' + error);
    }
  };

  const testThrowError = () => {
    try {
      throw new Error('🧪 Uncaught test error - this should be caught by Sentry');
    } catch (error) {
      Sentry.captureException(error);
      addResult('✅ Threw and caught error (sent to Sentry)');
    }
  };

  const testWithContext = () => {
    try {
      Sentry.setContext('test_context', {
        test_type: 'manual',
        timestamp: new Date().toISOString(),
        user_action: 'button_click',
      });
      
      Sentry.captureMessage('🧪 Test with custom context', 'info');
      addResult('✅ Sent message with custom context');
    } catch (error) {
      addResult('❌ Failed to send with context: ' + error);
    }
  };

  const checkSentryConfig = () => {
    const hasDSN = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    addResult(`📊 Sentry DSN configured: ${hasDSN ? 'Yes' : 'No'}`);
    addResult(`📊 Environment: ${process.env.NODE_ENV}`);
    addResult(`📊 Sentry enabled: ${!isDevelopment ? 'Yes' : 'No (disabled in dev)'}`);
    
    if (!hasDSN) {
      addResult('⚠️ Add NEXT_PUBLIC_SENTRY_DSN to .env.local to enable Sentry');
    }
    
    if (isDevelopment) {
      addResult('ℹ️ Sentry is disabled in development mode');
      addResult('ℹ️ Errors will only log to console');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-6 h-6 text-blue-600" />
              Sentry Integration Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-slate-400">
              Use these buttons to test if Sentry is receiving errors and messages.
              Check your Sentry dashboard at{' '}
              <a 
                href="https://sentry.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                sentry.io
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Configuration Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Configuration Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={checkSentryConfig} variant="outline" className="w-full">
              Check Sentry Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Test Sentry Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={testSentryMessage} variant="outline">
                📨 Send Test Message
              </Button>
              
              <Button onClick={testSentryError} variant="outline">
                🐛 Send Test Error
              </Button>
              
              <Button onClick={testLoggerError} variant="outline">
                📝 Test Logger Error
              </Button>
              
              <Button onClick={testLoggerWarning} variant="outline">
                ⚠️ Test Logger Warning
              </Button>
              
              <Button onClick={testThrowError} variant="outline">
                💥 Throw Test Error
              </Button>
              
              <Button onClick={testWithContext} variant="outline">
                🏷️ Test with Context
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                No tests run yet. Click a button above to test Sentry.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-sm font-mono"
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}
            
            {testResults.length > 0 && (
              <Button
                onClick={() => setTestResults([])}
                variant="outline"
                className="w-full mt-4"
              >
                Clear Results
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Verify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Check Configuration</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Click "Check Sentry Configuration" to see if Sentry is properly configured.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">2. Run Tests</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Click any test button above. Each will send data to Sentry.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">3. Check Sentry Dashboard</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Go to your Sentry dashboard and look for:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-slate-400 mt-2 space-y-1">
                <li>Issues tab - Should show test errors</li>
                <li>Look for "🧪 Test" in the error messages</li>
                <li>Check timestamps match when you clicked buttons</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">4. Development Mode Note</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Sentry is disabled in development mode. To test:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-slate-400 mt-2 space-y-1">
                <li>Set NODE_ENV=production temporarily, OR</li>
                <li>Deploy to production/staging, OR</li>
                <li>Check browser console for logged errors</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Tip:</strong> If you don't see errors in Sentry, check:
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                <li>NEXT_PUBLIC_SENTRY_DSN is set in .env.local</li>
                <li>You're in production mode (not development)</li>
                <li>Your Sentry project is active</li>
                <li>Browser console for any Sentry errors</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
