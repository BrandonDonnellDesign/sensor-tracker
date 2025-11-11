'use client';

import { HeroSection } from '@/components/dashboard/hero-section';
import { EnhancedStatsGrid } from '@/components/dashboard/enhanced-stats-grid';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel';
import { CompactGamification } from '@/components/dashboard/compact-gamification';
import { StreamlinedQuickActions } from '@/components/dashboard/streamlined-quick-actions';
import { IOBTracker } from '@/components/insulin/iob-tracker';
import { QuickDoseLogger } from '@/components/insulin/quick-dose-logger';
import { TDIDashboard } from '@/components/insulin/tdi-dashboard';
import { BasalTrends } from '@/components/insulin/basal-trends';
import SensorExpirationAlerts from '@/components/notifications/sensor-expiration-alerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensor_models?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
};

interface WidgetRendererProps {
  widgetType: string;
  widgetSize: string;
  className?: string;
  // Data props
  sensors?: Sensor[];
  currentSensor?: Sensor;
  statsData?: any;
  userAchievements?: any[];
  insightData?: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  problematicCount?: number;
  onDoseLogged?: () => void;
}

export function WidgetRenderer({
  widgetType,
  widgetSize,
  className = '',
  sensors = [],
  currentSensor,
  statsData,
  userAchievements = [],
  insightData,
  onRefresh,
  isRefreshing,
  problematicCount,
  onDoseLogged,
}: WidgetRendererProps) {
  const getSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 md:col-span-2';
      case 'large': return 'col-span-1 md:col-span-2 lg:col-span-1';
      case 'full': return 'col-span-full';
      default: return 'col-span-1';
    }
  };

  const fullClassName = `${getSizeClass(widgetSize)} ${className}`;

  switch (widgetType) {
    case 'hero':
      return currentSensor ? (
        <div className={fullClassName}>
          <HeroSection 
            currentSensor={currentSensor}
            totalSensors={sensors.length}
          />
        </div>
      ) : null;

    case 'stats':
      return statsData ? (
        <div className={fullClassName}>
          <EnhancedStatsGrid stats={statsData} />
        </div>
      ) : null;

    case 'sensor-alerts':
      return (
        <div className={fullClassName}>
          <SensorExpirationAlerts sensors={sensors} />
        </div>
      );

    case 'iob-tracker':
      return (
        <div className={fullClassName}>
          <IOBTracker showDetails />
        </div>
      );

    case 'quick-dose':
      return (
        <div className={fullClassName}>
          <QuickDoseLogger onDoseLogged={onDoseLogged || (() => {})} />
        </div>
      );

    case 'tdi':
      return (
        <div className={fullClassName}>
          <TDIDashboard />
        </div>
      );

    case 'basal-trends':
      return (
        <div className={fullClassName}>
          <BasalTrends />
        </div>
      );

    case 'activity-timeline':
      return (
        <div className={fullClassName}>
          <ActivityTimeline 
            sensors={sensors}
            userAchievements={userAchievements}
          />
        </div>
      );

    case 'ai-insights':
      return insightData && sensors.length > 0 ? (
        <div className={fullClassName}>
          <AIInsightsPanel data={insightData} />
        </div>
      ) : null;

    case 'gamification':
      return (
        <div className={fullClassName}>
          <CompactGamification />
        </div>
      );

    case 'quick-actions':
      return (
        <div className={fullClassName}>
          <StreamlinedQuickActions 
            onRefresh={onRefresh || (() => {})}
            isRefreshing={isRefreshing || false}
            problematicCount={problematicCount || 0}
          />
        </div>
      );

    case 'glucose-chart':
      return (
        <div className={fullClassName}>
          <Card>
            <CardHeader>
              <CardTitle>Glucose Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">
                Glucose chart widget - Coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      );

    case 'food-summary':
      return (
        <div className={fullClassName}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Meals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">
                Food summary widget - Coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      );

    default:
      return null;
  }
}
