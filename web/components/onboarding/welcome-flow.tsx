'use client';

import { useState } from 'react';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { 
  Activity, 
  Camera, 
  BarChart3, 
  Shield, 
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface WelcomeFlowProps {
  onComplete: () => void;
  user?: any;
}

export function WelcomeFlow({ onComplete, user }: WelcomeFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to CGM Tracker',
      subtitle: 'Your personal CGM sensor management companion',
      icon: <Activity className="w-16 h-16 text-blue-600" />,
      content: (
        <div className="text-center space-y-4">
          <p className="text-gray-600 dark:text-slate-400">
            Track your CGM sensors, monitor performance, and get insights to optimize your diabetes management.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              🎉 Welcome, {user?.email || 'User'}! Let's get you started.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Track Your Sensors',
      subtitle: 'Monitor sensor lifecycle and performance',
      icon: <Activity className="w-16 h-16 text-green-600" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Add new sensors with photos</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Track wear time and expiration</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Monitor sensor performance</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Capture & Analyze',
      subtitle: 'Photo documentation and smart insights',
      icon: <Camera className="w-16 h-16 text-purple-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-slate-400 text-center">
            Take photos of your sensors to track placement, condition, and identify patterns.
          </p>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Camera className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-medium text-purple-800 dark:text-purple-200">Smart Analysis</p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  AI-powered insights from your sensor photos
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Analytics & Insights',
      subtitle: 'Understand your sensor patterns',
      icon: <BarChart3 className="w-16 h-16 text-orange-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-slate-400 text-center">
            Get detailed analytics on sensor performance, wear patterns, and optimization recommendations.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
              <BarChart3 className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Performance Trends</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
              <Activity className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Wear Patterns</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'You\'re All Set!',
      subtitle: 'Ready to start tracking your CGM sensors',
      icon: <CheckCircle className="w-16 h-16 text-green-600" />,
      content: (
        <div className="text-center space-y-4">
          <p className="text-gray-600 dark:text-slate-400">
            Your account is ready! Start by adding your first sensor or explore the dashboard.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
            <div className="flex items-center justify-center space-x-3">
              <Shield className="w-6 h-6 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-green-800 dark:text-green-200">Secure & Private</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your data is encrypted and secure
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-center space-x-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-slate-400">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {currentStepData.icon}
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              {currentStepData.subtitle}
            </p>
            
            {currentStepData.content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <TouchFriendlyButton
              variant="ghost"
              onClick={handlePrevious}
              disabled={isFirstStep}
              icon={<ArrowLeft />}
              className={isFirstStep ? 'invisible' : ''}
            >
              Previous
            </TouchFriendlyButton>

            <TouchFriendlyButton
              variant="primary"
              onClick={handleNext}
              icon={isLastStep ? <CheckCircle /> : <ArrowRight />}
              iconPosition="right"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </TouchFriendlyButton>
          </div>
        </div>

        {/* Skip Option */}
        {!isLastStep && (
          <div className="text-center mt-4">
            <button
              onClick={onComplete}
              className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
            >
              Skip tutorial
            </button>
          </div>
        )}
      </div>
    </div>
  );
}