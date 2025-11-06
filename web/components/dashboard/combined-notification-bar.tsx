'use client';

import { memo, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info, Lightbulb, Bell } from 'lucide-react';
import { SmartNotification } from '@/lib/notifications/smart-notifications';
import { RealtimeNotification } from '@/lib/realtime-notifications';

interface CombinedNotificationBarProps {
  smartNotifications: SmartNotification[];
  realtimeNotifications: RealtimeNotification[];
  onDismissSmartNotification: (id: string) => void;
  onDismissRealtimeNotification: (id: string) => void;
  maxVisible?: number;
}

export const CombinedNotificationBar = memo(function CombinedNotificationBar({
  smartNotifications,
  realtimeNotifications,
  onDismissSmartNotification,
  onDismissRealtimeNotification,
  maxVisible = 3
}: CombinedNotificationBarProps) {
  
  const getNotificationIcon = useCallback((type: string, priority?: string) => {
    const iconClass = "w-5 h-5";
    
    // Handle realtime notification priorities
    if (priority === 'urgent') {
      return <AlertTriangle className={`${iconClass} text-red-500`} />;
    }
    
    switch (type) {
      case 'warning':
      case 'smart_alert':
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
      case 'alert':
        return <AlertTriangle className={`${iconClass} text-red-500`} />;
      case 'celebration':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'tip':
        return <Lightbulb className={`${iconClass} text-purple-500`} />;
      case 'reminder':
      case 'test':
        return <Bell className={`${iconClass} text-blue-500`} />;
      default:
        return <Info className={`${iconClass} text-blue-500`} />;
    }
  }, []);

  const getNotificationStyles = useCallback((type: string, priority?: string) => {
    const baseStyles = "p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-sm";
    
    // Handle realtime notification priorities first
    if (priority === 'urgent') {
      return `${baseStyles} border-l-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse`;
    }
    if (priority === 'high') {
      return `${baseStyles} border-l-orange-500 bg-orange-50 dark:bg-orange-900/20`;
    }
    
    switch (type) {
      case 'warning':
      case 'smart_alert':
        return `${baseStyles} border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20`;
      case 'alert':
        return `${baseStyles} border-l-red-500 bg-red-50 dark:bg-red-900/20`;
      case 'celebration':
        return `${baseStyles} border-l-green-500 bg-green-50 dark:bg-green-900/20`;
      case 'tip':
        return `${baseStyles} border-l-purple-500 bg-purple-50 dark:bg-purple-900/20`;
      case 'reminder':
      case 'test':
        return `${baseStyles} border-l-blue-500 bg-blue-50 dark:bg-blue-900/20`;
      default:
        return `${baseStyles} border-l-gray-500 bg-gray-50 dark:bg-gray-900/20`;
    }
  }, []);

  const getPriorityBadge = useCallback((priority: string) => {
    const baseStyles = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
    
    switch (priority) {
      case 'urgent':
        return `${baseStyles} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 animate-pulse`;
      case 'high':
        return `${baseStyles} bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300`;
      case 'medium':
        return `${baseStyles} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`;
      case 'low':
        return `${baseStyles} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`;
      default:
        return `${baseStyles} bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300`;
    }
  }, []);

  // Combine and sort notifications by priority and timestamp
  const combinedNotifications = [
    // Realtime notifications (from database/WebSocket)
    ...realtimeNotifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority,
      source: 'realtime' as const,
      timestamp: new Date(n.created_at),
      actionable: !!n.metadata?.action_url,
      action: n.metadata?.action_url ? {
        label: 'View Details',
        url: n.metadata.action_url
      } : undefined,
      dismissible: true,
      confidence: n.metadata?.confidence
    })),
    // Smart notifications (client-side generated)
    ...smartNotifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority,
      source: 'smart' as const,
      timestamp: n.createdAt,
      actionable: n.actionable,
      action: n.action,
      dismissible: n.dismissible,
      confidence: n.confidence
    }))
  ]
    .sort((a, b) => {
      // Sort by priority first (urgent > high > medium > low)
      const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority as keyof typeof priorityWeight] || 1;
      const bPriority = priorityWeight[b.priority as keyof typeof priorityWeight] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by timestamp (newest first)
      return b.timestamp.getTime() - a.timestamp.getTime();
    })
    .slice(0, maxVisible); // Limit visible notifications

  const remainingCount = (smartNotifications.length + realtimeNotifications.length) - maxVisible;

  if (combinedNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {combinedNotifications.map((notification) => (
        <div
          key={`${notification.source}-${notification.id}`}
          className={getNotificationStyles(notification.type, notification.priority)}
        >
          <div className="flex items-start space-x-3">
            {getNotificationIcon(notification.type, notification.priority)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900 dark:text-slate-100">
                  {notification.title}
                </h4>
                <span className={getPriorityBadge(notification.priority)}>
                  {notification.priority}
                </span>
                {notification.source === 'realtime' && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    Live
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                {notification.message}
              </p>
              
              {notification.actionable && notification.action && (
                <div className="flex items-center space-x-4">
                  <a
                    href={notification.action.url}
                    className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    {notification.action.label}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  
                  {notification.confidence && (
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                      Confidence: {Math.round(notification.confidence * 100)}%
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {notification.dismissible && (
              <button
                onClick={() => {
                  if (notification.source === 'realtime') {
                    onDismissRealtimeNotification(notification.id);
                  } else {
                    onDismissSmartNotification(notification.id);
                  }
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                title="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="text-center">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
            View {remainingCount} more notification{remainingCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
});