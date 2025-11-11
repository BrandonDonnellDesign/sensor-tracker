'use client';

import { useState } from 'react';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { 
  Activity, 
  Plus, 
  TrendingUp, 
  ChevronRight,
  ChevronLeft,
  X,
  Smartphone,
  BarChart3,
  Bell,
  Syringe,
  UtensilsCrossed,
  Zap,
  Shield,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EnhancedWelcomeFlowProps {
  onComplete: () => void;
  onSkip: () => void;
  userEmail?: string;
}

const welcomeSteps = [
  {
    id: 1,
    title: 'Welcome to CGM Tracker!',
    subtitle: 'Your complete diabetes management companion',
    icon: <Activity className="w-12 h-12 text-blue-600" />,
    gradient: 'from-blue-500 to-indigo-600',
    content: (userEmail?: string) => (
      <div className="text-center space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            👋 Welcome{userEmail ? `, ${userEmail.split('@')[0]}` : ''}!
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Join thousands managing their diabetes with confidence
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium">Sensor Tracking</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Monitor CGM performance</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Syringe className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium">Insulin IOB</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Real-time tracking</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-medium">Meal Logging</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Smart carb tracking</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium">Analytics</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400">AI-powered insights</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: 'Track Your Sensors',
    subtitle: 'Complete CGM sensor lifecycle management',
    icon: <Plus className="w-12 h-12 text-green-600" />,
    gradient: 'from-green-500 to-emerald-600',
    content: () => (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Dexcom G7</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">Added today • 10 days left</p>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Active
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-50 dark:bg-slate-700 rounded p-2">
              <div className="font-bold text-gray-900 dark:text-slate-100">Day 1</div>
              <div className="text-gray-600 dark:text-slate-400">of 10</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700 rounded p-2">
              <div className="font-bold text-gray-900 dark:text-slate-100">100%</div>
              <div className="text-gray-600 dark:text-slate-400">Uptime</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700 rounded p-2">
              <div className="font-bold text-gray-900 dark:text-slate-100">$85</div>
              <div className="text-gray-600 dark:text-slate-400">Cost</div>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <span>Track expiration dates, performance, and costs</span>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: 'Insulin on Board (IOB)',
    subtitle: 'Real-time insulin tracking with safety alerts',
    icon: <Syringe className="w-12 h-12 text-blue-600" />,
    gradient: 'from-blue-500 to-cyan-600',
    content: () => (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">3.2u</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Active Insulin</div>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-blue-600 flex items-center justify-center">
              <Syringe className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-xs text-blue-800 dark:text-blue-200">
            Peak in 45 minutes • Clears in 2h 15m
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <Shield className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-600 dark:text-slate-400">
              <strong className="text-gray-900 dark:text-slate-100">Safety alerts</strong> for insulin stacking
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-600 dark:text-slate-400">
              <strong className="text-gray-900 dark:text-slate-100">TDI tracking</strong> with basal/bolus breakdown
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Zap className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-600 dark:text-slate-400">
              <strong className="text-gray-900 dark:text-slate-100">Voice logging</strong> for hands-free entry
            </span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: 'Smart Analytics',
    subtitle: 'AI-powered insights and pattern detection',
    icon: <BarChart3 className="w-12 h-12 text-purple-600" />,
    gradient: 'from-purple-500 to-pink-600',
    content: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
            <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
            <div className="text-xl font-bold text-gray-900 dark:text-slate-100">8.5</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Avg. Sensor Days</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
            <Activity className="w-6 h-6 text-blue-600 mb-2" />
            <div className="text-xl font-bold text-gray-900 dark:text-slate-100">94%</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Success Rate</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
            <Syringe className="w-6 h-6 text-orange-600 mb-2" />
            <div className="text-xl font-bold text-gray-900 dark:text-slate-100">42u</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Avg. Daily Insulin</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
            <UtensilsCrossed className="w-6 h-6 text-purple-600 mb-2" />
            <div className="text-xl font-bold text-gray-900 dark:text-slate-100">1:12</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Carb Ratio</div>
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">AI Insights</span>
          </div>
          <p className="text-xs text-purple-800 dark:text-purple-200">
            Pattern detection, trend analysis, and personalized recommendations
          </p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: 'Mobile Optimized',
    subtitle: 'Perfect experience on any device',
    icon: <Smartphone className="w-12 h-12 text-indigo-600" />,
    gradient: 'from-indigo-500 to-purple-600',
    content: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
            <Smartphone className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-gray-900 dark:text-slate-100">PWA</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Install</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
            <Bell className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-gray-900 dark:text-slate-100">Alerts</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Push</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
            <Zap className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-gray-900 dark:text-slate-100">Offline</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Ready</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>Works offline with automatic sync</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>Install as app on your home screen</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>Push notifications for important alerts</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: 'You\'re All Set!',
    subtitle: 'Ready to start your diabetes management journey',
    icon: <CheckCircle2 className="w-12 h-12 text-green-600" />,
    gradient: 'from-green-500 to-emerald-600',
    content: () => (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-green-900 dark:text-green-100">Account Ready!</div>
              <div className="text-xs text-green-700 dark:text-green-300">All features unlocked</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">Quick Start Options:</div>
          <div className="space-y-2">
            <button className="w-full text-left bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">Add Your First Sensor</div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">Start tracking your CGM</div>
                </div>
              </div>
            </button>
            <button className="w-full text-left bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-3">
                <Syringe className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">Log Insulin Dose</div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">Track your insulin</div>
                </div>
              </div>
            </button>
            <button className="w-full text-left bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">Explore Dashboard</div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">See all features</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }
];

export function EnhancedWelcomeFlow({ onComplete, onSkip, userEmail }: EnhancedWelcomeFlowProps) {
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
  const isLastStep = currentStep === welcomeSteps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Skip Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onSkip}
            className="flex items-center space-x-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 text-sm transition-colors"
          >
            <span>Skip tour</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-center space-x-2 mb-3">
            {welcomeSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-gradient-to-r ' + step.gradient
                    : index < currentStep
                    ? 'w-6 bg-blue-400'
                    : 'w-4 bg-gray-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 dark:text-slate-400">
            Step {currentStep + 1} of {welcomeSteps.length}
          </p>
        </div>

        {/* Main Content */}
        <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Gradient Header */}
          <div className={`h-2 bg-gradient-to-r ${step.gradient}`} />
          
          <div className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                <div className="text-white">
                  {step.icon}
                </div>
              </div>
            </div>

            {/* Title and Subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {step.title}
              </h1>
              <p className="text-gray-600 dark:text-slate-400 text-sm">
                {step.subtitle}
              </p>
            </div>

            {/* Step Content */}
            <div className="mb-8">
              {step.content(userEmail)}
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
                Back
              </TouchFriendlyButton>

              <TouchFriendlyButton
                variant="primary"
                size="md"
                icon={isLastStep ? <CheckCircle2 /> : <ChevronRight />}
                iconPosition="right"
                onClick={handleNext}
                className={`bg-gradient-to-r ${step.gradient} hover:opacity-90`}
              >
                {isLastStep ? 'Get Started' : 'Next'}
              </TouchFriendlyButton>
            </div>
          </div>
        </Card>

        {/* Bottom Hint */}
        {isLastStep && (
          <div className="text-center mt-6 space-y-3">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              💡 <strong>Pro tip:</strong> Enable notifications for important alerts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
