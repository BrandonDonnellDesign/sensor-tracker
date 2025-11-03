'use client';

import { useState } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Code,
  Settings,
  Users,
  MessageSquare,
  Shield,
  Calendar
} from 'lucide-react';

interface TestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  testType: string;
  recipientEmail: string;
  providerInfo?: any;
}

export default function EmailTestSuite() {
  const [testEmail, setTestEmail] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const emailTypes = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      description: 'New user welcome message',
      icon: <Users className="h-5 w-5 text-green-600" />,
      color: 'green'
    },
    {
      id: 'comment_reply',
      name: 'Comment Reply',
      description: 'Notification when someone replies to a comment',
      icon: <MessageSquare className="h-5 w-5 text-blue-600" />,
      color: 'blue'
    },
    {
      id: 'admin_alert',
      name: 'Admin Alert',
      description: 'Alert for flagged content',
      icon: <Shield className="h-5 w-5 text-red-600" />,
      color: 'red'
    },
    {
      id: 'weekly_digest',
      name: 'Weekly Digest',
      description: 'Weekly community summary',
      icon: <Calendar className="h-5 w-5 text-purple-600" />,
      color: 'purple'
    }
  ];

  const sendTestEmail = async (testType: string) => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setLoading(testType);

    try {
      const response = await authenticatedFetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType,
          recipientEmail: testEmail
        }),
      });

      const result = await response.json();
      
      setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      if (result.success) {
        alert(`✅ ${testType} email sent successfully!`);
      } else {
        alert(`❌ Failed to send ${testType} email: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('❌ Error sending test email');
    } finally {
      setLoading(null);
    }
  };

  const sendAllTests = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    for (const emailType of emailTypes) {
      await sendTestEmail(emailType.id);
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getProviderStatus = () => {
    const lastResult = testResults[0];
    if (!lastResult?.providerInfo) return null;

    const { provider, hasApiKey, fromEmail } = lastResult.providerInfo;
    
    return (
      <div className={`p-3 rounded-lg border ${
        provider === 'mock' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          <span className="font-medium">
            Provider: {provider} {hasApiKey ? '✅' : '❌'}
          </span>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          From: {fromEmail}
        </div>
        {provider === 'mock' && (
          <div className="text-sm text-yellow-700 mt-1">
            ⚠️ Using mock mode - emails won't actually be sent
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Mail className="h-6 w-6 text-blue-600 mr-2" />
              Email Test Suite
            </h2>
            <p className="text-gray-600">Test all email templates and delivery</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-2 rounded-lg border ${
                previewMode 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <Eye className="h-4 w-4 mr-1 inline" />
              Preview Mode
            </button>
          </div>
        </div>

        {/* Test Email Input */}
        <div className="flex space-x-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={sendAllTests}
              disabled={loading !== null || !testEmail}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Test All
            </button>
          </div>
        </div>

        {/* Provider Status */}
        {getProviderStatus()}
      </div>

      {/* Email Type Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {emailTypes.map((emailType) => (
          <div key={emailType.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {emailType.icon}
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">{emailType.name}</h3>
                  <p className="text-sm text-gray-600">{emailType.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => sendTestEmail(emailType.id)}
                disabled={loading === emailType.id || !testEmail}
                className={`w-full px-4 py-2 rounded-md font-medium flex items-center justify-center ${
                  emailType.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                  emailType.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                  emailType.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-purple-600 hover:bg-purple-700'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === emailType.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </button>

              {previewMode && (
                <button
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Template
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Code className="h-5 w-5 text-gray-600 mr-2" />
            Test Results
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    )}
                    <span className="font-medium capitalize">
                      {result.testType.replace('_', ' ')} → {result.recipientEmail}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
                
                {result.messageId && (
                  <div className="text-sm text-gray-600 mt-1">
                    Message ID: {result.messageId}
                  </div>
                )}
                
                {result.error && (
                  <div className="text-sm text-red-700 mt-1">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Setup Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📧 Email Setup Guide</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1. Database:</strong> Run <code>web/scripts/quick-fix-trigger.sql</code> to fix trigger errors</p>
          <p><strong>2. Email Provider:</strong> Set up Resend or SendGrid API keys in environment variables</p>
          <p><strong>3. Test:</strong> Use this test suite to verify email delivery</p>
          <p><strong>4. Production:</strong> Configure weekly digest scheduling (cron job)</p>
        </div>
      </div>
    </div>
  );
}