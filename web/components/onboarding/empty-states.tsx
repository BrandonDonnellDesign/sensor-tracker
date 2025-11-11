'use client';

import { 
  Activity, 
  Plus, 
  Syringe, 
  UtensilsCrossed, 
  BarChart3,
  FileText,
  Search,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tips?: string[];
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  tips
}: EmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      {/* Icon */}
      {icon && (
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}

      {/* Content */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
        {action && (
          <Button
            onClick={action.onClick}
            size="lg"
            className="w-full sm:w-auto"
          >
            {action.icon}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-start gap-2 text-left">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <div className="font-medium mb-1">💡 Quick Tips:</div>
              <ul className="space-y-1 text-xs">
                {tips.map((tip, index) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// Preset empty states
export function NoSensorsEmptyState() {
  return (
    <EmptyState
      icon={<Activity className="w-10 h-10 text-gray-400" />}
      title="No Sensors Yet"
      description="Start tracking your CGM sensors to monitor performance, identify patterns, and optimize your diabetes management."
      action={{
        label: 'Add Your First Sensor',
        onClick: () => window.location.href = '/dashboard/sensors/new',
        icon: <Plus className="w-4 h-4 mr-2" />
      }}
      secondaryAction={{
        label: 'Learn More',
        onClick: () => window.location.href = '/dashboard/help'
      }}
      tips={[
        'Add sensors when you insert them for accurate tracking',
        'Include photos to track placement and condition',
        'Set reminders for sensor changes'
      ]}
    />
  );
}

export function NoInsulinLogsEmptyState() {
  return (
    <EmptyState
      icon={<Syringe className="w-10 h-10 text-gray-400" />}
      title="No Insulin Logs"
      description="Track your insulin doses to calculate IOB, monitor TDI, and get safety alerts for insulin stacking."
      action={{
        label: 'Log Your First Dose',
        onClick: () => {
          const logButton = document.querySelector('[data-log-insulin]') as HTMLButtonElement;
          logButton?.click();
        },
        icon: <Plus className="w-4 h-4 mr-2" />
      }}
      secondaryAction={{
        label: 'Try Voice Logging',
        onClick: () => {
          const voiceButton = document.querySelector('[data-voice-log]') as HTMLButtonElement;
          voiceButton?.click();
        }
      }}
      tips={[
        'Log doses immediately for accurate IOB tracking',
        'Use voice logging for hands-free entry',
        'Include notes for meal boluses and corrections'
      ]}
    />
  );
}

export function NoFoodLogsEmptyState() {
  return (
    <EmptyState
      icon={<UtensilsCrossed className="w-10 h-10 text-gray-400" />}
      title="No Meals Logged"
      description="Track your meals to analyze carb intake, calculate insulin doses, and understand meal impact on glucose."
      action={{
        label: 'Log Your First Meal',
        onClick: () => window.location.href = '/dashboard/food',
        icon: <Plus className="w-4 h-4 mr-2" />
      }}
      tips={[
        'Log meals with carb counts for better insulin dosing',
        'Track meal timing to correlate with glucose trends',
        'Use meal templates for frequently eaten foods'
      ]}
    />
  );
}

export function NoAnalyticsDataEmptyState() {
  return (
    <EmptyState
      icon={<BarChart3 className="w-10 h-10 text-gray-400" />}
      title="Not Enough Data Yet"
      description="Keep logging sensors, insulin, and meals to unlock powerful analytics and insights."
      action={{
        label: 'View Dashboard',
        onClick: () => window.location.href = '/dashboard',
        icon: <Activity className="w-4 h-4 mr-2" />
      }}
      tips={[
        'Analytics require at least 7 days of data',
        'More data = better insights and recommendations',
        'Consistent logging improves pattern detection'
      ]}
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="w-10 h-10 text-gray-400" />}
      title="No Results Found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search or filters.`}
      secondaryAction={{
        label: 'Clear Search',
        onClick: () => {
          const searchInput = document.querySelector('[data-search]') as HTMLInputElement;
          if (searchInput) searchInput.value = '';
        }
      }}
      tips={[
        'Try using different keywords',
        'Check your spelling',
        'Use broader search terms'
      ]}
    />
  );
}

export function ErrorEmptyState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-10 h-10 text-red-500" />}
      title="Something Went Wrong"
      description={error || 'An unexpected error occurred. Please try again.'}
      {...(onRetry && {
        action: {
          label: 'Try Again',
          onClick: onRetry
        }
      })}
      secondaryAction={{
        label: 'Go to Dashboard',
        onClick: () => window.location.href = '/dashboard'
      }}
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <EmptyState
      icon={<FileText className="w-10 h-10 text-gray-400" />}
      title="No Notifications"
      description="You're all caught up! Notifications will appear here when you have sensor alerts, IOB warnings, or system updates."
      tips={[
        'Enable push notifications for instant alerts',
        'Customize notification settings in Settings',
        'Important safety alerts are always shown'
      ]}
    />
  );
}
