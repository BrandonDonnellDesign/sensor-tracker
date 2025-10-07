import Link from 'next/link';

interface QuickActionsProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function QuickActions({ onRefresh, isRefreshing = false }: QuickActionsProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">Quick Actions</h3>
      
      {/* Primary Actions */}
      <div className="space-y-3 mb-6">
        <Link
          href="/dashboard/sensors/new"
          className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Sensor
        </Link>
        
        <Link
          href="/dashboard/sensors"
          className="flex items-center justify-center w-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 font-medium py-3 px-4 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View All Sensors
        </Link>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`flex items-center justify-center w-full font-medium py-3 px-4 rounded-xl transition-colors ${
              isRefreshing
                ? 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100'
            }`}
          >
            <svg
              className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        )}
      </div>

      {/* Secondary Actions Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/dashboard/sensors?filter=problematic"
          className="flex flex-col items-center justify-center p-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors"
        >
          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm font-medium text-center">Problem Sensors</span>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="flex flex-col items-center justify-center p-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
        >
          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-sm font-medium text-center">Analytics</span>
        </Link>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="pt-6 border-t border-gray-200 dark:border-slate-600">
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Keyboard Shortcuts</h4>
        <div className="grid grid-cols-1 gap-2 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-slate-400">New Sensor</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">Alt+N</kbd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-slate-400">Refresh</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">Alt+R</kbd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-slate-400">Search</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">Alt+S</kbd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-slate-400">All Sensors</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">G→S</kbd>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-slate-600">
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">Support & Help</h4>
        <div className="grid grid-cols-1 gap-2">
          <a
            href="https://dexcom.custhelp.com/app/webform"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-3 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Dexcom Replacement</span>
          </a>
          
          <a
            href="https://www.freestyle.abbott/us-en/support/sensorsupportrequest.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-3 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Abbott Replacement</span>
          </a>
          
          <Link
            href="/dashboard/help"
            className="flex items-center p-3 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>App Help & FAQ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}