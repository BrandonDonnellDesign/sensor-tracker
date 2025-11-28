'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_DASHBOARD_WIDGETS, DashboardWidget } from '@/components/dashboard/unified-dashboard-customizer';

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_DASHBOARD_WIDGETS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved configuration from localStorage
    const saved = localStorage.getItem('main-dashboard-widgets');
    const version = localStorage.getItem('dashboard-widgets-version');
    const CURRENT_VERSION = '2'; // Increment when DEFAULT_DASHBOARD_WIDGETS changes

    if (saved && version === CURRENT_VERSION) {
      try {
        const parsed = JSON.parse(saved);
        setWidgets(parsed);
      } catch (error) {
        console.error('Failed to load saved widgets:', error);
        setWidgets(DEFAULT_DASHBOARD_WIDGETS);
        localStorage.setItem('dashboard-widgets-version', CURRENT_VERSION);
      }
    } else {
      // Force update to new default configuration
      console.log('Updating dashboard widgets to new version');
      setWidgets(DEFAULT_DASHBOARD_WIDGETS);
      localStorage.setItem('main-dashboard-widgets', JSON.stringify(DEFAULT_DASHBOARD_WIDGETS));
      localStorage.setItem('dashboard-widgets-version', CURRENT_VERSION);
    }
    setLoading(false);
  }, []);

  const updateWidgets = (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('main-dashboard-widgets', JSON.stringify(newWidgets));
    localStorage.setItem('dashboard-widgets-version', '2');
  };

  const getEnabledWidgets = () => {
    return widgets
      .filter(w => w.enabled)
      .sort((a, b) => a.order - b.order);
  };

  const getWidgetsByCategory = (category: string) => {
    return widgets
      .filter(w => w.enabled && w.category === category)
      .sort((a, b) => a.order - b.order);
  };

  const isWidgetEnabled = (widgetId: string) => {
    return widgets.find(w => w.id === widgetId)?.enabled || false;
  };

  const getWidgetSize = (widgetId: string) => {
    return widgets.find(w => w.id === widgetId)?.size || 'medium';
  };

  return {
    widgets,
    loading,
    updateWidgets,
    getEnabledWidgets,
    getWidgetsByCategory,
    isWidgetEnabled,
    getWidgetSize,
  };
}
