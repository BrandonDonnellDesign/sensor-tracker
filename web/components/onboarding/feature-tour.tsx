'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface FeatureTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export function FeatureTour({ steps, onComplete, onSkip }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const step = steps[currentStep];

  useEffect(() => {
    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight element
      element.style.position = 'relative';
      element.style.zIndex = '9999';
      element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
      element.style.borderRadius = '8px';
      
      // Calculate position for tooltip
      const rect = element.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'top':
          top = rect.top - 120;
          left = rect.left + rect.width / 2 - 150;
          break;
        case 'bottom':
          top = rect.bottom + 20;
          left = rect.left + rect.width / 2 - 150;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - 60;
          left = rect.left - 320;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - 60;
          left = rect.right + 20;
          break;
      }

      setPosition({ top, left });
    }

    return () => {
      if (element) {
        element.style.position = '';
        element.style.zIndex = '';
        element.style.boxShadow = '';
        element.style.borderRadius = '';
      }
    };
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onSkip} />

      {/* Tooltip */}
      <Card
        className="fixed z-[10000] w-80 p-4 shadow-2xl"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span className="text-xs font-medium text-gray-500">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {step.description}
          </p>
        </div>

        {/* Action Button */}
        {step.action && (
          <Button
            variant="outline"
            size="sm"
            onClick={step.action.onClick}
            className="w-full mb-3"
          >
            {step.action.label}
          </Button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </Card>
    </>
  );
}

// Predefined tours
export const dashboardTour: TourStep[] = [
  {
    target: '[data-tour="active-sensor"]',
    title: 'Active Sensor',
    description: 'Your currently active CGM sensor with real-time status and days remaining.',
    position: 'bottom'
  },
  {
    target: '[data-tour="iob-widget"]',
    title: 'Insulin on Board',
    description: 'Track active insulin in your system with real-time decay curves and safety alerts.',
    position: 'bottom'
  },
  {
    target: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    description: 'Fast access to common tasks like adding sensors, logging insulin, or recording meals.',
    position: 'left'
  },
  {
    target: '[data-tour="customize-dashboard"]',
    title: 'Customize Dashboard',
    description: 'Drag and drop widgets, show/hide sections, and personalize your dashboard layout.',
    position: 'left',
    action: {
      label: 'Try Customizing',
      onClick: () => {
        const button = document.querySelector('[data-tour="customize-dashboard"]') as HTMLButtonElement;
        button?.click();
      }
    }
  }
];

export const insulinTour: TourStep[] = [
  {
    target: '[data-tour="iob-display"]',
    title: 'Current IOB',
    description: 'See your active insulin with time remaining and peak activity.',
    position: 'bottom'
  },
  {
    target: '[data-tour="log-dose"]',
    title: 'Log Insulin',
    description: 'Quickly log doses with voice input or manual entry. IOB is calculated automatically.',
    position: 'bottom',
    action: {
      label: 'Try Voice Logging',
      onClick: () => {
        const button = document.querySelector('[data-tour="voice-log"]') as HTMLButtonElement;
        button?.click();
      }
    }
  },
  {
    target: '[data-tour="tdi-chart"]',
    title: 'Total Daily Insulin',
    description: 'Track your daily insulin usage with basal/bolus breakdown and trends.',
    position: 'top'
  }
];

export const sensorTour: TourStep[] = [
  {
    target: '[data-tour="add-sensor"]',
    title: 'Add New Sensor',
    description: 'Log a new CGM sensor with photos, serial number, and placement notes.',
    position: 'bottom',
    action: {
      label: 'Add Sensor',
      onClick: () => window.location.href = '/dashboard/sensors/new'
    }
  },
  {
    target: '[data-tour="sensor-list"]',
    title: 'Sensor History',
    description: 'View all your sensors with performance metrics, costs, and issues.',
    position: 'top'
  },
  {
    target: '[data-tour="analytics"]',
    title: 'Sensor Analytics',
    description: 'Get insights on sensor performance, wear patterns, and optimization tips.',
    position: 'top'
  }
];
