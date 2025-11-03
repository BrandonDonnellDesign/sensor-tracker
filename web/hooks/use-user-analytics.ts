import { useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

interface UserEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export function useUserAnalytics() {
  const { user } = useAuth();

  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    const eventData: UserEvent = {
      event,
      properties: {
        ...properties,
        user_id: user?.id,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        user_agent: navigator.userAgent,
      },
    };

    // Send to analytics service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      }).catch(console.error);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', eventData);
    }
  }, [user?.id]);

  // Track sensor-specific events
  const trackSensorEvent = useCallback((action: string, sensorData?: any) => {
    trackEvent('sensor_action', {
      action,
      sensor_id: sensorData?.id,
      sensor_type: sensorData?.sensor_models?.model_name,
      ...sensorData,
    });
  }, [trackEvent]);

  // Track food logging events
  const trackFoodEvent = useCallback((action: string, foodData?: any) => {
    trackEvent('food_action', {
      action,
      food_id: foodData?.id,
      meal_type: foodData?.meal_type,
      ...foodData,
    });
  }, [trackEvent]);

  // Track performance issues
  const trackPerformanceIssue = useCallback((issue: string, details?: any) => {
    trackEvent('performance_issue', {
      issue,
      ...details,
    });
  }, [trackEvent]);

  // Auto-track page views
  useEffect(() => {
    trackEvent('page_view', {
      page: window.location.pathname,
      referrer: document.referrer,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackSensorEvent,
    trackFoodEvent,
    trackPerformanceIssue,
  };
}