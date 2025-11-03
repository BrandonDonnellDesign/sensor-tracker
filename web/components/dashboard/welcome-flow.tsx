'use client';

import { useState } from 'react';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { 
  Activity, 
  Plus, 
  TrendingUp, 
  Award,
  ChevronRight,
  ChevronLeft,
  X,
  Smartphone,
  BarChart3,
  Bell
} from 'lucide-react';

interface WelcomeFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const welcomeSteps = [
  {
    id: 1,
    title: 'Welcome to CGM Tracker!',
    subtitle: 'Your personal continuous glucose monitor companion',
    icon: <Activity className="w-12 h-12 text-blue-600" />,
    content: (
      <div className="text-center space-y-4">
        <p className="text-gray-600 dark:text-slate-400">
          Track your CGM sensors, monitor performance, and get insights to optimize your diabetes management.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Join thousands of users who have improved their CGM experience with our tracking tools.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: 'Track Your Sensors',
    subtitle: 'Log every sensor for complete visibility',
    icon: <Plus className="w-12 h-12 text-green-600" />,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-slate-400 text-center">
          Add sensors when you insert them and track their performance over time.
        </p>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Dexcom G7</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Added today • 10 days left</p>
            </div>
            <div className="ml-auto">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: 'Monitor Performance',
    subtitle: 'Get insights into your sensor patterns',
    icon: <TrendingUp className="w-12 h-12 text-purple-600" />,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-slate-400 text-center">
          See how long your sensors last, identify patterns, and optimize your CGM experience.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">8.5</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Avg. Days</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">94%</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Success Rate</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: 'Earn Achievements',
    subtitle: 'Stay motivated with gamification',
    icon: <Award className="w-12 h-12 text-yellow-600" />,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-slate-400 text-center">
          Unlock badges, build streaks, and compete with the community to stay engaged.
        </p>
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <Award className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm">First Sensor</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">Track your first CGM sensor</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm">Week Streak</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">7 days of consistent tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: 'Mobile Optimized',
    subtitle: 'Perfect experience on any device',
    icon: <Smartphone className="w-12 h-12 text-indigo-600" />,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-slate-400 text-center">
          Enjoy a seamless experience whether you're on your phone, tablet, or desktop.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
            <Smartphone className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
            <div className="text-xs text-gray-600 dark:text-slate-400">Mobile</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
            <BarChart3 className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
            <div className="text-xs text-gray-600 dark:text-slate-400">Analytics</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
            <Bell className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
            <div className="text-xs text-gray-600 dark:text-slate-400">Alerts</div>
          </div>
        </div>
      </div>
    )
  }
];

export function WelcomeFlow({ onComplete, onSkip }: WelcomeFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = welcomeSteps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Skip Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onSkip}
            className="flex items-center space-x-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 text-sm"
          >
            <span>Skip</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center space-x-2 mb-8">
          {welcomeSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                index === currentStep
                  ? 'bg-blue-600'
                  : index < currentStep
                  ? 'bg-blue-300'
                  : 'bg-gray-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center">
              {step.icon}
            </div>
          </div>

          {/* Title and Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {step.title}
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              {step.subtitle}
            </p>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {step.content}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <TouchFriendlyButton
              variant="ghost"
              size="md"
              icon={<ChevronLeft />}
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={currentStep === 0 ? 'invisible' : ''}
            >
              Previous
            </TouchFriendlyButton>

            <span className="text-sm text-gray-500 dark:text-slate-400">
              {currentStep + 1} of {welcomeSteps.length}
            </span>

            <TouchFriendlyButton
              variant="primary"
              size="md"
              icon={currentStep === welcomeSteps.length - 1 ? undefined : <ChevronRight />}
              iconPosition="right"
              onClick={handleNext}
            >
              {currentStep === welcomeSteps.length - 1 ? 'Get Started' : 'Next'}
            </TouchFriendlyButton>
          </div>
        </div>

        {/* Bottom CTA */}
        {currentStep === welcomeSteps.length - 1 && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Ready to start tracking your CGM sensors?
            </p>
            <TouchFriendlyButton
              variant="outline"
              size="lg"
              fullWidth
              icon={<Plus />}
              onClick={() => {
                onComplete();
                window.location.href = '/dashboard/sensors/new';
              }}
            >
              Add Your First Sensor
            </TouchFriendlyButton>
          </div>
        )}
      </div>
    </div>
  );
}