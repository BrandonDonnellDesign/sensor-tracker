'use client';

import Link from 'next/link';
import {
  Plus,
  Search,
  BarChart3,
  AlertTriangle,
  Download,
  ExternalLink,
  Keyboard,
  HelpCircle,
} from 'lucide-react';

interface StreamlinedQuickActionsProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  problematicCount?: number;
}

export function StreamlinedQuickActions({
  onRefresh: _onRefresh,
  isRefreshing: _isRefreshing = false,
  problematicCount = 0,
}: StreamlinedQuickActionsProps) {
  return (
    <div className='bg-[#1e293b] rounded-lg p-6 border border-slate-700/30'>
      <div className='flex items-center mb-6'>
        <div className='flex items-center space-x-3'>
          <div className='w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg'>
            <Plus className='w-5 h-5 text-white' />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              Quick Actions
            </h3>
            <p className='text-sm text-gray-600 dark:text-slate-400'>
              Fast access to key features
            </p>
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <div className='space-y-4 mb-6'>
        <div className='grid grid-cols-2 gap-4'>
          <Link
            href='/dashboard/sensors'
            className='flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 group border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'>
            <Search className='w-6 h-6 text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2 transition-colors' />
            <span className='text-sm font-medium text-gray-900 dark:text-slate-100 mb-1'>
              View All
            </span>
            <span className='text-xs text-gray-500 dark:text-slate-500'>
              Sensors
            </span>
          </Link>

          <Link
            href='/dashboard/insulin'
            className='flex flex-col items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl transition-all duration-200 group border border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700'>
            <svg className='w-6 h-6 text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 mb-2 transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z' />
            </svg>
            <span className='text-sm font-medium text-gray-900 dark:text-slate-100 mb-1'>
              Log Insulin
            </span>
            <span className='text-xs text-gray-500 dark:text-slate-500'>
              Bolus
            </span>
          </Link>
        </div>
        
        <div className='grid grid-cols-2 gap-4'>
          <Link
            href='/dashboard/replacement-tracking'
            className='flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 group border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700'>
            <svg className='w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 mb-2 transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6m6-6v6' />
            </svg>
            <span className='text-sm font-medium text-gray-900 dark:text-slate-100 mb-1'>
              Track Shipments
            </span>
            <span className='text-xs text-gray-500 dark:text-slate-500'>
              Replacements
            </span>
          </Link>
          
          <Link
            href='/dashboard/analytics'
            className='flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 group border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'>
            <BarChart3 className='w-6 h-6 text-gray-600 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 mb-2 transition-colors' />
            <span className='text-sm font-medium text-gray-900 dark:text-slate-100'>
              Analytics
            </span>
            <span className='text-xs text-gray-500 dark:text-slate-500'>
              Insights
            </span>
          </Link>
        </div>
      </div>

      {/* Secondary Actions Grid */}
      <div className='grid grid-cols-2 gap-4 mb-6'>
        {problematicCount > 0 ? (
          <Link
            href='/dashboard/sensors?filter=problematic'
            className='relative flex flex-col items-center justify-center p-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 group'>
            <AlertTriangle className='w-6 h-6 mb-2 group-hover:scale-110 transition-transform' />
            <span className='text-sm font-medium text-center'>Issues</span>
            <span className='text-xs opacity-75'>
              {problematicCount} sensors
            </span>

            {/* Notification badge */}
            <div className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold'>
              {problematicCount}
            </div>
          </Link>
        ) : (
          <Link
            href='/dashboard/sensors?filter=active'
            className='relative flex flex-col items-center justify-center p-4 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 border border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:bg-gradient-to-br hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 rounded-xl transition-all duration-200 group overflow-hidden'>
            {/* Success icon */}
            <div className='relative w-6 h-6 mb-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-200'>
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>

            <span className='text-sm font-medium text-center mb-1'>
              Healthy
            </span>
            <span className='text-xs opacity-75 text-center'>View active</span>

            {/* Subtle background decoration */}
            <div className='absolute top-1 right-1 w-2 h-2 bg-green-400/30 rounded-full'></div>
          </Link>
        )}

        <Link
          href='/dashboard/settings?tab=export'
          className='flex flex-col items-center justify-center p-4 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl transition-all duration-200 group'>
          <Download className='w-6 h-6 mb-2 group-hover:scale-110 transition-transform' />
          <span className='text-sm font-medium text-center'>Export</span>
          <span className='text-xs opacity-75'>Data</span>
        </Link>
      </div>

      {/* Support Section */}
      <div className='pt-6 border-t border-gray-200 dark:border-slate-600'>
        <h4 className='text-sm font-medium text-gray-700 dark:text-slate-300 mb-4 flex items-center'>
          <HelpCircle className='w-4 h-4 mr-2' />
          Quick Support
        </h4>

        <div className='grid grid-cols-1 gap-2'>
          <a
            href='https://dexcom.custhelp.com/app/webform'
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center justify-between p-3 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 group'>
            <div className='flex items-center'>
              <div className='w-2 h-2 bg-blue-500 rounded-full mr-3'></div>
              <span>Dexcom Support</span>
            </div>
            <ExternalLink className='w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity' />
          </a>

          <a
            href='https://www.freestyle.abbott/us-en/support/sensorsupportrequest.html'
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center justify-between p-3 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 group'>
            <div className='flex items-center'>
              <div className='w-2 h-2 bg-orange-500 rounded-full mr-3'></div>
              <span>Abbott Support</span>
            </div>
            <ExternalLink className='w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity' />
          </a>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className='pt-4 border-t border-gray-200 dark:border-slate-600 mt-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <Keyboard className='w-4 h-4 text-gray-500 dark:text-slate-400' />
            <span className='text-xs text-gray-500 dark:text-slate-400'>
              Keyboard shortcuts available
            </span>
          </div>
          <button
            onClick={() => {
              // Could open a shortcuts modal or tooltip
              alert(
                'Keyboard Shortcuts:\n\nAlt+N - New Sensor\nAlt+R - Refresh\nAlt+S - Search\nG then S - All Sensors (Gmail-style)'
              );
            }}
            className='text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'>
            View All
          </button>
        </div>
      </div>
    </div>
  );
}
