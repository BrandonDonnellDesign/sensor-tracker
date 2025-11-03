'use client';

import { useState, useCallback } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Zap, 
  Activity, 
  Clock, 
  Target,
  Lightbulb,
  ExternalLink
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  goodThreshold: string;
  poorThreshold: string;
  tips: string[];
  impact: string;
}

const guideSections: GuideSection[] = [
  {
    id: 'lcp',
    title: 'Largest Contentful Paint (LCP)',
    icon: <Eye className="w-5 h-5" />,
    description: 'Measures loading performance. It marks the point when the largest content element visible in the viewport finishes rendering.',
    goodThreshold: '≤ 2.5 seconds',
    poorThreshold: '> 4.0 seconds',
    impact: 'Users perceive your site as fast when LCP is good. Poor LCP leads to high bounce rates.',
    tips: [
      'Optimize and compress images',
      'Upgrade web hosting for faster server response times',
      'Remove unused CSS and JavaScript',
      'Use a Content Delivery Network (CDN)',
      'Implement lazy loading for images below the fold'
    ]
  },
  {
    id: 'inp',
    title: 'Interaction to Next Paint (INP)',
    icon: <Zap className="w-5 h-5" />,
    description: 'Measures responsiveness. It assesses how quickly your site responds to user interactions like clicks, taps, and keyboard inputs.',
    goodThreshold: '≤ 200 milliseconds',
    poorThreshold: '> 500 milliseconds',
    impact: 'Good INP makes your site feel responsive and smooth. Poor INP frustrates users with laggy interactions.',
    tips: [
      'Minimize JavaScript execution time',
      'Break up long-running tasks',
      'Optimize event handlers',
      'Use web workers for heavy computations',
      'Reduce third-party script impact'
    ]
  },
  {
    id: 'cls',
    title: 'Cumulative Layout Shift (CLS)',
    icon: <Activity className="w-5 h-5" />,
    description: 'Measures visual stability. It quantifies how much visible content shifts during the loading process.',
    goodThreshold: '≤ 0.1',
    poorThreshold: '> 0.25',
    impact: 'Good CLS prevents accidental clicks and provides a stable user experience. Poor CLS is frustrating and can lead to user errors.',
    tips: [
      'Always include size attributes on images and videos',
      'Reserve space for ads and embeds',
      'Avoid inserting content above existing content',
      'Use CSS transforms instead of changing layout properties',
      'Preload custom fonts to prevent font swapping'
    ]
  },
  {
    id: 'fcp',
    title: 'First Contentful Paint (FCP)',
    icon: <Clock className="w-5 h-5" />,
    description: 'Measures loading performance. It marks the time when the first text or image content appears on screen.',
    goodThreshold: '≤ 1.8 seconds',
    poorThreshold: '> 3.0 seconds',
    impact: 'Good FCP gives users confidence that your page is loading. Poor FCP makes users think your site is broken.',
    tips: [
      'Optimize font loading with font-display: swap',
      'Remove render-blocking resources',
      'Minify CSS and JavaScript',
      'Use efficient cache policies',
      'Optimize server response times'
    ]
  }
];

export function PerformanceGuide() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId);
  }, []);

  return (
    <div className="bg-[#1e293b] rounded-lg shadow border border-slate-700/30">
      <div className="p-6 border-b border-slate-700/30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <BookOpen className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Performance Guide</h2>
            <p className="text-sm text-slate-400">
              Learn how to improve your Core Web Vitals scores
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-700/30">
        {guideSections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-6 text-left hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    section.id === 'lcp' ? 'bg-green-500/20 text-green-400' :
                    section.id === 'inp' ? 'bg-blue-500/20 text-blue-400' :
                    section.id === 'cls' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-100">{section.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {section.description}
                    </p>
                  </div>
                </div>
                {expandedSection === section.id ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSection === section.id && (
              <div className="px-6 pb-6">
                <div className="ml-14 space-y-6">
                  {/* Thresholds */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-900/20 border border-green-800/50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="w-4 h-4 text-green-400" />
                        <span className="font-medium text-green-100">Good Score</span>
                      </div>
                      <p className="text-green-200">{section.goodThreshold}</p>
                    </div>
                    <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="w-4 h-4 text-red-400" />
                        <span className="font-medium text-red-100">Poor Score</span>
                      </div>
                      <p className="text-red-200">{section.poorThreshold}</p>
                    </div>
                  </div>

                  {/* Impact */}
                  <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                    <h4 className="font-medium text-blue-100 mb-2">Why This Matters</h4>
                    <p className="text-blue-200">{section.impact}</p>
                  </div>

                  {/* Improvement Tips */}
                  <div className="p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      <h4 className="font-medium text-yellow-100">Improvement Tips</h4>
                    </div>
                    <ul className="space-y-2">
                      {section.tips.map((tip, index) => (
                        <li key={index} className="flex items-start space-x-2 text-yellow-200">
                          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* External Resources */}
                  <div className="flex items-center space-x-4 pt-4 border-t border-slate-700/50">
                    <a
                      href={`https://web.dev/${section.id.toLowerCase()}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Learn more on web.dev</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="p-6 bg-slate-800/30 border-t border-slate-700/30">
        <h3 className="font-medium text-slate-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://pagespeed.web.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-3 bg-slate-800/50 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-200"
          >
            <div className="p-2 bg-blue-500/20 rounded">
              <ExternalLink className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="font-medium text-slate-100 text-sm">PageSpeed Insights</div>
              <div className="text-xs text-slate-400">Test your site</div>
            </div>
          </a>
          <a
            href="https://developers.google.com/web/tools/lighthouse"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-3 bg-slate-800/50 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-200"
          >
            <div className="p-2 bg-green-500/20 rounded">
              <ExternalLink className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <div className="font-medium text-slate-100 text-sm">Lighthouse</div>
              <div className="text-xs text-slate-400">Audit tool</div>
            </div>
          </a>
          <a
            href="https://web.dev/vitals/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-3 bg-slate-800/50 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-200"
          >
            <div className="p-2 bg-purple-500/20 rounded">
              <ExternalLink className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="font-medium text-slate-100 text-sm">Web Vitals Guide</div>
              <div className="text-xs text-slate-400">Complete guide</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}