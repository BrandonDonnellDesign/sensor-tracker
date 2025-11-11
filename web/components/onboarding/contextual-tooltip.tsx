'use client';

import { useState, useEffect } from 'react';
import { X, Lightbulb, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContextualTooltipProps {
  id: string;
  title: string;
  description: string;
  type?: 'info' | 'tip' | 'warning' | 'success';
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  showOnce?: boolean;
  children: React.ReactNode;
}

export function ContextualTooltip({
  id,
  title,
  description,
  type = 'tip',
  action,
  dismissible = true,
  showOnce = true,
  children
}: ContextualTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    // Check if tooltip has been dismissed
    const dismissed = localStorage.getItem(`tooltip-dismissed-${id}`);
    if (dismissed && showOnce) {
      return;
    }

    // Show tooltip after a short delay
    const timer = setTimeout(() => {
      if (!hasBeenShown) {
        setIsVisible(true);
        setHasBeenShown(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [id, showOnce, hasBeenShown]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (showOnce) {
      localStorage.setItem(`tooltip-dismissed-${id}`, 'true');
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'info':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      case 'warning':
        return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20';
      case 'success':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
    }
  };

  return (
    <div className="relative">
      {children}
      
      {isVisible && (
        <Card className={`absolute top-full left-0 mt-2 w-80 p-4 shadow-lg z-50 ${getColorClasses()}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-slate-100">
                  {title}
                </h4>
                {dismissible && (
                  <button
                    onClick={handleDismiss}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
                {description}
              </p>
              
              {action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    action.onClick();
                    handleDismiss();
                  }}
                  className="w-full"
                >
                  {action.label}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Preset tooltips for common scenarios
export function FirstSensorTooltip({ children }: { children: React.ReactNode }) {
  return (
    <ContextualTooltip
      id="first-sensor"
      title="Add Your First Sensor"
      description="Start tracking by adding your current CGM sensor. Include photos and notes for better insights."
      type="tip"
      action={{
        label: 'Add Sensor Now',
        onClick: () => window.location.href = '/dashboard/sensors/new'
      }}
    >
      {children}
    </ContextualTooltip>
  );
}

export function IOBExplanationTooltip({ children }: { children: React.ReactNode }) {
  return (
    <ContextualTooltip
      id="iob-explanation"
      title="What is IOB?"
      description="Insulin on Board (IOB) shows how much active insulin is in your system. This helps prevent insulin stacking and hypoglycemia."
      type="info"
    >
      {children}
    </ContextualTooltip>
  );
}

export function VoiceLoggingTooltip({ children }: { children: React.ReactNode }) {
  return (
    <ContextualTooltip
      id="voice-logging"
      title="Try Voice Logging"
      description="Log insulin doses hands-free! Just click the microphone and say your dose amount."
      type="tip"
      action={{
        label: 'Try It Now',
        onClick: () => {
          const voiceButton = document.querySelector('[data-voice-log]') as HTMLButtonElement;
          voiceButton?.click();
        }
      }}
    >
      {children}
    </ContextualTooltip>
  );
}

export function CustomizeDashboardTooltip({ children }: { children: React.ReactNode }) {
  return (
    <ContextualTooltip
      id="customize-dashboard"
      title="Customize Your Dashboard"
      description="Drag and drop widgets, show/hide sections, and create your perfect dashboard layout."
      type="tip"
      action={{
        label: 'Customize Now',
        onClick: () => {
          const customizeButton = document.querySelector('[data-customize]') as HTMLButtonElement;
          customizeButton?.click();
        }
      }}
    >
      {children}
    </ContextualTooltip>
  );
}
