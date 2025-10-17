'use client';

export function DashboardSkeleton() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800'>
      <div className='max-w-7xl mx-auto px-4 py-6 space-y-8'>
        {/* Hero Section Skeleton - Enhanced */}
        <div className='bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-3xl p-8 mb-8 border border-blue-100 dark:border-slate-700 shadow-xl'>
          <div className='animate-pulse'>
            {/* Title skeleton with enhanced pulse */}
            <div className='h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg w-1/3 mb-4 animate-pulse'></div>

            {/* Subtitle skeleton */}
            <div className='h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-2/3 mb-6 animate-pulse'></div>

            {/* Connection status card */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-dashed border-gray-300 dark:border-slate-600 shadow-lg'>
              <div className='h-16 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded-full w-16 mx-auto mb-4 animate-pulse'></div>
              <div className='h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-1/2 mx-auto mb-2 animate-pulse'></div>
              <div className='h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-3/4 mx-auto animate-pulse'></div>
            </div>
          </div>
        </div>

        {/* Stats Grid Skeleton - Enhanced */}
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8'>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1'>
              <div className='animate-pulse'>
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex-1'>
                    {/* Label skeleton */}
                    <div className='h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-1/2 mb-2 animate-pulse'></div>

                    {/* Value skeleton */}
                    <div className='h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-3/4 mb-1 animate-pulse'></div>

                    {/* Change indicator skeleton */}
                    <div className='h-3 bg-gradient-to-r from-green-200 via-green-300 to-green-200 dark:from-green-700 dark:via-green-600 dark:to-green-700 rounded w-1/3 animate-pulse'></div>
                  </div>

                  {/* Icon skeleton with enhanced styling */}
                  <div className='w-12 h-12 bg-gradient-to-br from-indigo-200 via-indigo-300 to-indigo-200 dark:from-indigo-700 dark:via-indigo-600 dark:to-indigo-700 rounded-xl animate-pulse shadow-lg'>
                    <div className='w-full h-full bg-white/20 dark:bg-slate-800/20 rounded-xl animate-pulse'></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid Skeleton */}
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-8'>
          {/* Left Column */}
          <div className='xl:col-span-2 space-y-8'>
            {/* Activity Timeline Skeleton - Enhanced */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300'>
              <div className='animate-pulse'>
                {/* Header */}
                <div className='flex items-center space-x-3 mb-6'>
                  <div className='w-10 h-10 bg-gradient-to-br from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded-full animate-pulse'></div>
                  <div>
                    <div className='h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-32 mb-1 animate-pulse'></div>
                    <div className='h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-48 animate-pulse'></div>
                  </div>
                </div>

                {/* Timeline items */}
                <div className='space-y-4'>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className='flex items-start space-x-4 group'>
                      {/* Timeline dot with connecting line */}
                      <div className='relative flex-shrink-0'>
                        <div className='w-8 h-8 bg-gradient-to-br from-green-200 via-green-300 to-green-200 dark:from-green-700 dark:via-green-600 dark:to-green-700 rounded-full animate-pulse'></div>
                        {i < 2 && (
                          <div className='absolute top-8 left-1/2 w-0.5 h-8 bg-gray-200 dark:bg-slate-600 transform -translate-x-1/2 animate-pulse'></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className='flex-1 pt-1'>
                        <div className='h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-3/4 mb-2 animate-pulse'></div>
                        <div className='h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-1/2 animate-pulse'></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Insights Skeleton - Enhanced */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300'>
              <div className='animate-pulse'>
                {/* Header with enhanced styling */}
                <div className='flex items-center justify-between mb-6'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-10 h-10 bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200 dark:from-purple-700 dark:via-purple-600 dark:to-purple-700 rounded-full animate-pulse'></div>
                    <div>
                      <div className='h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-32 mb-1 animate-pulse'></div>
                      <div className='h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-48 animate-pulse'></div>
                    </div>
                  </div>
                  {/* View all button skeleton */}
                  <div className='h-8 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded-lg w-20 animate-pulse'></div>
                </div>

                {/* Enhanced insight cards grid */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {[
                    {
                      color:
                        'from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30',
                      accent:
                        'from-emerald-300 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500',
                    },
                    {
                      color:
                        'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30',
                      accent:
                        'from-blue-300 to-blue-400 dark:from-blue-600 dark:to-blue-500',
                    },
                    {
                      color:
                        'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30',
                      accent:
                        'from-amber-300 to-amber-400 dark:from-amber-600 dark:to-amber-500',
                    },
                    {
                      color:
                        'from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30',
                      accent:
                        'from-rose-300 to-rose-400 dark:from-rose-600 dark:to-rose-500',
                    },
                  ].map((theme, i) => (
                    <div
                      key={i}
                      className={`relative p-5 bg-gradient-to-br ${theme.color} rounded-xl border border-gray-200/50 dark:border-slate-600/50 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 group`}>
                      {/* Insight icon */}
                      <div className='flex items-start justify-between mb-3'>
                        <div
                          className={`w-8 h-8 bg-gradient-to-br ${theme.accent} rounded-lg animate-pulse shadow-sm`}></div>
                        <div className='w-4 h-4 bg-gray-300 dark:bg-slate-600 rounded animate-pulse'></div>
                      </div>

                      {/* Insight title */}
                      <div className='h-5 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-slate-600 dark:via-slate-500 dark:to-slate-600 rounded w-3/4 mb-3 animate-pulse'></div>

                      {/* Insight value */}
                      <div className='h-7 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400 dark:from-slate-500 dark:via-slate-400 dark:to-slate-500 rounded w-1/2 mb-2 animate-pulse'></div>

                      {/* Insight description */}
                      <div className='space-y-1'>
                        <div className='h-3 bg-gray-300 dark:bg-slate-600 rounded w-full animate-pulse'></div>
                        <div className='h-3 bg-gray-300 dark:bg-slate-600 rounded w-2/3 animate-pulse'></div>
                      </div>

                      {/* Subtle accent line */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.accent} rounded-b-xl opacity-50`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className='space-y-8'>
            {/* Gamification Skeleton - Enhanced */}
            <div className='bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105'>
              <div className='animate-pulse'>
                <div className='flex items-center justify-between mb-6'>
                  <div className='flex items-center space-x-3'>
                    {/* Avatar */}
                    <div className='w-10 h-10 bg-white/30 rounded-full animate-pulse border-2 border-white/20'></div>
                    <div>
                      <div className='h-5 bg-white/30 rounded w-20 mb-1 animate-pulse'></div>
                      <div className='h-4 bg-white/20 rounded w-24 animate-pulse'></div>
                    </div>
                  </div>

                  {/* Level badge */}
                  <div className='h-8 bg-white/20 rounded-xl w-20 border border-white/30 animate-pulse'></div>
                </div>

                {/* Progress bar */}
                <div className='relative h-3 bg-white/20 rounded-full w-full mb-6'>
                  <div className='absolute left-0 top-0 h-full w-2/3 bg-white/40 rounded-full animate-pulse'></div>
                </div>

                {/* Achievement badges */}
                <div className='grid grid-cols-3 gap-4'>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className='text-center'>
                      <div className='w-8 h-8 bg-white/30 rounded-lg mx-auto mb-2 border border-white/20 animate-pulse'></div>
                      <div className='h-6 bg-white/20 rounded w-8 mx-auto mb-1 animate-pulse'></div>
                      <div className='h-3 bg-white/20 rounded w-12 mx-auto animate-pulse'></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions Skeleton - Enhanced */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300'>
              <div className='animate-pulse'>
                {/* Header with enhanced styling */}
                <div className='flex items-center justify-between mb-6'>
                  <div className='flex items-center space-x-3'>
                    <div className='w-10 h-10 bg-gradient-to-br from-orange-200 via-orange-300 to-orange-200 dark:from-orange-700 dark:via-orange-600 dark:to-orange-700 rounded-full animate-pulse'></div>
                    <div>
                      <div className='h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-32 mb-1 animate-pulse'></div>
                      <div className='h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded w-48 animate-pulse'></div>
                    </div>
                  </div>
                  {/* Settings button skeleton */}
                  <div className='w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-lg animate-pulse'></div>
                </div>

                {/* Enhanced action buttons */}
                <div className='space-y-4'>
                  {/* Primary action - Add Reading */}
                  <div className='relative p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-700/50 hover:shadow-md transition-all duration-300 group'>
                    <div className='flex items-center space-x-4'>
                      <div className='w-10 h-10 bg-gradient-to-br from-blue-300 to-blue-400 dark:from-blue-600 dark:to-blue-500 rounded-xl animate-pulse shadow-sm'></div>
                      <div className='flex-1'>
                        <div className='h-5 bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300 dark:from-blue-600 dark:via-blue-500 dark:to-blue-600 rounded w-3/4 mb-1 animate-pulse'></div>
                        <div className='h-3 bg-blue-200 dark:bg-blue-700/50 rounded w-1/2 animate-pulse'></div>
                      </div>
                      <div className='w-6 h-6 bg-blue-300 dark:bg-blue-600 rounded animate-pulse'></div>
                    </div>
                  </div>

                  {/* Secondary actions grid */}
                  <div className='grid grid-cols-2 gap-3'>
                    {[
                      {
                        color:
                          'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
                        accent:
                          'from-emerald-300 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500',
                        border: 'border-emerald-200 dark:border-emerald-700/50',
                      },
                      {
                        color:
                          'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
                        accent:
                          'from-purple-300 to-purple-400 dark:from-purple-600 dark:to-purple-500',
                        border: 'border-purple-200 dark:border-purple-700/50',
                      },
                    ].map((theme, i) => (
                      <div
                        key={i}
                        className={`relative p-4 bg-gradient-to-br ${theme.color} rounded-xl border ${theme.border} hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 group`}>
                        {/* Action icon */}
                        <div className='flex flex-col items-center text-center space-y-3'>
                          <div
                            className={`w-8 h-8 bg-gradient-to-br ${theme.accent} rounded-lg animate-pulse shadow-sm`}></div>

                          {/* Action title */}
                          <div className='space-y-1 w-full'>
                            <div className='h-4 bg-gray-300 dark:bg-slate-600 rounded w-3/4 mx-auto animate-pulse'></div>
                            <div className='h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mx-auto animate-pulse'></div>
                          </div>
                        </div>

                        {/* Subtle accent corner */}
                        <div
                          className={`absolute top-0 right-0 w-4 h-4 bg-gradient-to-br ${theme.accent} rounded-bl-lg rounded-tr-xl opacity-20`}></div>
                      </div>
                    ))}
                  </div>

                  {/* Additional quick actions */}
                  <div className='pt-2 border-t border-gray-200 dark:border-slate-700'>
                    <div className='grid grid-cols-3 gap-2'>
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className='p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors duration-200 group'>
                          <div className='flex flex-col items-center space-y-2'>
                            <div className='w-6 h-6 bg-gray-300 dark:bg-slate-600 rounded animate-pulse'></div>
                            <div className='h-3 bg-gray-300 dark:bg-slate-600 rounded w-12 animate-pulse'></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
