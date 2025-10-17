import { Metadata } from 'next';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { DynamicRoadmap } from '@/components/roadmap/dynamic-roadmap';

export const metadata: Metadata = {
  title: 'Product Roadmap | CGM Sensor Tracker',
  description: 'See what we\'re building to make CGM tracking even better',
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">
            Product Roadmap
          </h1>
          <p className="text-xl text-gray-600 dark:text-slate-400 mb-8">
            See what we&apos;re building to make CGM tracking even better
          </p>
          
          <div className="text-center mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
              🚀 Live updates from database
            </span>
          </div>
        </div>

        {/* Dynamic Roadmap Component */}
        <DynamicRoadmap 
          showFilters={true}
          showStats={true}
          showAdminControls={true}
        />

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Have a Feature Request?
            </h3>
            <p className="text-blue-800 dark:text-blue-400 mb-4">
              We&apos;d love to hear your ideas! Your feedback helps shape our roadmap.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Submit Feedback
              </button>
              <button className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 px-6 py-2 rounded-lg font-medium transition-colors">
                Join Community
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}