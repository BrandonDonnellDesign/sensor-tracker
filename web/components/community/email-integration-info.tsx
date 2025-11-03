'use client';

import { useState } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Calendar, 
  Shield, 
  Settings, 
  CheckCircle,
  Bell,
  Users
} from 'lucide-react';
import Link from 'next/link';

export function EmailIntegrationInfo() {
  const [activeTab, setActiveTab] = useState('overview');

  const emailFeatures = [
    {
      id: 'comment_replies',
      name: 'Comment Reply Notifications',
      description: 'Get notified when someone replies to your comments',
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
      example: 'When John replies to your comment on "CGM Sensor Tips", you\'ll receive an email with the reply content and a link to view the full conversation.',
      color: 'blue'
    },
    {
      id: 'weekly_digest',
      name: 'Weekly Community Digest',
      description: 'Weekly summary of top tips and discussions',
      icon: <Calendar className="w-6 h-6 text-purple-600" />,
      example: 'Every Monday, get a curated email with the week\'s most popular tips, trending discussions, and community highlights.',
      color: 'purple'
    },
    {
      id: 'admin_alerts',
      name: 'Admin Moderation Alerts',
      description: 'Notifications for flagged content (admins only)',
      icon: <Shield className="w-6 h-6 text-red-600" />,
      example: 'When content is flagged by the AI moderation system, admins receive immediate email alerts with moderation actions.',
      color: 'red'
    },
    {
      id: 'welcome',
      name: 'Welcome Emails',
      description: 'Onboarding emails for new community members',
      icon: <Users className="w-6 h-6 text-green-600" />,
      example: 'New users receive a welcome email with community guidelines, tips for getting started, and links to popular content.',
      color: 'green'
    }
  ];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: <Mail className="w-4 h-4" /> },
    { id: 'features', name: 'Features', icon: <Bell className="w-4 h-4" /> },
    { id: 'settings', name: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center space-x-3">
          <Mail className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Community Email Integration</h2>
            <p className="text-blue-100">Stay connected with automated email notifications</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Automated Email Notifications
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                Our community email system keeps you engaged with relevant notifications and updates. 
                All emails are carefully crafted to provide value while respecting your preferences.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-900 dark:text-green-100">Smart Notifications</h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Only receive emails for interactions that matter to you, with intelligent filtering to avoid spam.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Full Control</h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Customize your notification preferences and unsubscribe from any email type at any time.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Email Delivery Status</h4>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-slate-400">System Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-slate-400">Templates Ready</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-slate-400">Queue Processing</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Available Email Notifications
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Here are all the email notification types available in the community system:
              </p>
            </div>

            <div className="space-y-4">
              {emailFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className={`border rounded-lg p-6 ${
                    feature.color === 'blue' ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' :
                    feature.color === 'purple' ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20' :
                    feature.color === 'red' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' :
                    'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                        {feature.name}
                      </h4>
                      <p className="text-gray-600 dark:text-slate-400 mb-3">
                        {feature.description}
                      </p>
                      <div className="bg-white dark:bg-slate-800 rounded-md p-3 border border-gray-200 dark:border-slate-600">
                        <p className="text-sm text-gray-700 dark:text-slate-300">
                          <strong>Example:</strong> {feature.example}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Manage Your Email Preferences
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Control which emails you receive and how often. You can change these settings at any time.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Notification Settings
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300">
                    Configure your community email preferences in your account settings.
                  </p>
                </div>
                <Link
                  href="/dashboard/settings?tab=notifications"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Open Settings</span>
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-slate-100">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                    <div className="font-medium text-gray-900 dark:text-slate-100">Enable All Notifications</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">Turn on all community email types</div>
                  </button>
                  <button className="w-full text-left p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                    <div className="font-medium text-gray-900 dark:text-slate-100">Essential Only</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">Only comment replies and important alerts</div>
                  </button>
                  <button className="w-full text-left p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                    <div className="font-medium text-gray-900 dark:text-slate-100">Disable All</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">Turn off all community emails</div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-slate-100">Email Frequency</h4>
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Comment Replies</span>
                      <span className="text-gray-900 dark:text-slate-100">Immediate</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Weekly Digest</span>
                      <span className="text-gray-900 dark:text-slate-100">Mondays</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Admin Alerts</span>
                      <span className="text-gray-900 dark:text-slate-100">Immediate</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Welcome Emails</span>
                      <span className="text-gray-900 dark:text-slate-100">One-time</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}