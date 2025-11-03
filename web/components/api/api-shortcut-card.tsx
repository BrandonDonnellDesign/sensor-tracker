'use client';

import Link from 'next/link';
import { Key, ExternalLink, Settings } from 'lucide-react';

interface ApiShortcutCardProps {
  variant?: 'default' | 'compact' | 'minimal';
  showDocs?: boolean;
  className?: string;
}

export function ApiShortcutCard({ 
  variant = 'default', 
  showDocs = true,
  className = '' 
}: ApiShortcutCardProps) {
  if (variant === 'minimal') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <Link
          href="/dashboard/settings?tab=api"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <Key className="w-4 h-4 mr-1" />
          API Keys
        </Link>
        {showDocs && (
          <Link
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            API Docs
          </Link>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-slate-100">API Access</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Manage keys & docs</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/settings?tab=api"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Keys
            </Link>
            {showDocs && (
              <Link
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Docs
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Key className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">
              API Integration
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-3">
              Access your data programmatically with secure API keys
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/settings?tab=api"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage API Keys
              </Link>
              {showDocs && (
                <Link
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Documentation
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Rate Limits</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Up to 10K/hour</div>
          </div>
          <div>
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Endpoints</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">REST API</div>
          </div>
          <div>
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Auth</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">API Keys & JWT</div>
          </div>
        </div>
      </div>
    </div>
  );
}