'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, AlertCircle, Info, Zap, Target, TrendingUp } from 'lucide-react';

interface OptimizationTip {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'react' | 'bundle' | 'network' | 'runtime';
  implemented?: boolean;
  codeExample?: string;
}

const optimizationTips: OptimizationTip[] = [
  {
    id: 'react-memo',
    title: 'Use React.memo for Pure Components',
    description: 'Wrap components in React.memo to prevent unnecessary re-renders when props haven\'t changed.',
    impact: 'high',
    difficulty: 'easy',
    category: 'react',
    implemented: true,
    codeExample: `const MyComponent = memo(function MyComponent({ data }) {
  return <div>{data.name}</div>;
});`
  },
  {
    id: 'use-callback',
    title: 'Optimize Event Handlers with useCallback',
    description: 'Use useCallback to memoize event handlers and prevent child component re-renders.',
    impact: 'medium',
    difficulty: 'easy',
    category: 'react',
    implemented: true,
    codeExample: `const handleClick = useCallback(() => {
  setCount(prev => prev + 1);
}, []);`
  },
  {
    id: 'use-memo',
    title: 'Cache Expensive Calculations with useMemo',
    description: 'Use useMemo for expensive computations that depend on specific dependencies.',
    impact: 'high',
    difficulty: 'easy',
    category: 'react',
    implemented: true,
    codeExample: `const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);`
  },
  {
    id: 'lazy-loading',
    title: 'Implement Code Splitting with Lazy Loading',
    description: 'Split your bundle using React.lazy and Suspense for better initial load times.',
    impact: 'high',
    difficulty: 'medium',
    category: 'bundle',
    implemented: false,
    codeExample: `const LazyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  );
}`
  },
  {
    id: 'image-optimization',
    title: 'Optimize Images with next/image',
    description: 'Use Next.js Image component for automatic optimization, lazy loading, and responsive images.',
    impact: 'high',
    difficulty: 'easy',
    category: 'network',
    implemented: false,
    codeExample: `import Image from 'next/image';

<Image
  src="/photo.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={false}
/>`
  },
  {
    id: 'bundle-analysis',
    title: 'Analyze Bundle Size Regularly',
    description: 'Use bundle analyzer to identify large dependencies and optimize imports.',
    impact: 'medium',
    difficulty: 'medium',
    category: 'bundle',
    implemented: false,
    codeExample: `// package.json
"scripts": {
  "analyze": "cross-env ANALYZE=true npm run build"
}`
  }
];

interface PerformanceOptimizationGuideProps {
  showImplemented?: boolean;
}

export const PerformanceOptimizationGuide = memo(function PerformanceOptimizationGuide({ 
  showImplemented = true 
}: PerformanceOptimizationGuideProps) {
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleTip = useCallback((tipId: string) => {
    setExpandedTips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tipId)) {
        newSet.delete(tipId);
      } else {
        newSet.add(tipId);
      }
      return newSet;
    });
  }, []);

  const filteredTips = useMemo(() => {
    let tips = optimizationTips;
    
    if (!showImplemented) {
      tips = tips.filter(tip => !tip.implemented);
    }
    
    if (selectedCategory !== 'all') {
      tips = tips.filter(tip => tip.category === selectedCategory);
    }
    
    return tips;
  }, [showImplemented, selectedCategory]);

  const categoryStats = useMemo(() => {
    const stats = {
      total: optimizationTips.length,
      implemented: optimizationTips.filter(tip => tip.implemented).length,
      byCategory: {} as Record<string, { total: number; implemented: number }>
    };

    optimizationTips.forEach(tip => {
      if (!stats.byCategory[tip.category]) {
        stats.byCategory[tip.category] = { total: 0, implemented: 0 };
      }
      stats.byCategory[tip.category].total++;
      if (tip.implemented) {
        stats.byCategory[tip.category].implemented++;
      }
    });

    return stats;
  }, []);

  const getImpactColor = useCallback((impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  }, []);

  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }, []);

  const getCategoryIcon = useCallback((category: string) => {
    switch (category) {
      case 'react': return <Zap className="w-4 h-4" />;
      case 'bundle': return <Target className="w-4 h-4" />;
      case 'network': return <TrendingUp className="w-4 h-4" />;
      case 'runtime': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          Performance Optimization Guide
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-slate-400">
            {categoryStats.implemented}/{categoryStats.total} implemented
          </span>
          <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 rounded-full h-2 transition-all duration-500"
              style={{ width: `${(categoryStats.implemented / categoryStats.total) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            All ({categoryStats.total})
          </button>
          {Object.entries(categoryStats.byCategory).map(([category, stats]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 ${
                selectedCategory === category
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {getCategoryIcon(category)}
              <span className="capitalize">{category} ({stats.implemented}/{stats.total})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Optimization Tips */}
      <div className="space-y-4">
        {filteredTips.map((tip) => (
          <div
            key={tip.id}
            className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleTip(tip.id)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {expandedTips.has(tip.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  {tip.implemented ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-slate-100">
                      {tip.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                      {tip.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(tip.impact)}`}>
                    {tip.impact} impact
                  </span>
                  <span className={`text-xs font-medium ${getDifficultyColor(tip.difficulty)}`}>
                    {tip.difficulty}
                  </span>
                </div>
              </div>
            </button>
            
            {expandedTips.has(tip.id) && tip.codeExample && (
              <div className="px-4 pb-4">
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">
                    Code Example:
                  </h5>
                  <pre className="text-sm text-gray-700 dark:text-slate-300 overflow-x-auto">
                    <code>{tip.codeExample}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredTips.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-slate-400">
            {showImplemented 
              ? 'No optimization tips match your current filter.'
              : 'All optimizations in this category have been implemented!'
            }
          </p>
        </div>
      )}
    </div>
  );
});