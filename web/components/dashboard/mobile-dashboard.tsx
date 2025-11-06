'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useGamification } from '@/components/providers/gamification-provider';
import { createClient } from '@/lib/supabase-client';
import { MobileOptimizedCard } from '@/components/ui/mobile-optimized-card';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { 
  Activity, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Camera,
  Calendar,
  Zap,
  RefreshCw
} from 'lucide-react';

interface MobileDashboardProps {
  className?: string;
}

export function MobileDashboard({ className }: MobileDashboardProps) {
  const { user } = useAuth();
  const { userStats } = useGamification();
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSensors = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) setRefreshing(true);

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from('sensors')
        .select(`
          *,
          sensor_models (
            manufacturer,
            model_name,
            duration_days
          )
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSensors(data || []);
    } catch (error) {
      console.error('Error fetching sensors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSensors();
    }
  }, [user]);

  // Filter out expired sensors for mobile display
  const activeSensorsData = sensors.filter(s => {
    const sensorModel = s.sensor_models || { duration_days: 10 };
    const expirationDate = new Date(s.date_added);
    expirationDate.setDate(expirationDate.getDate() + sensorModel.duration_days);
    return expirationDate > new Date(); // Only show non-expired sensors
  });

  // Calculate stats (using only active sensors)
  const totalSensors = activeSensorsData.length;
  const problematicSensors = activeSensorsData.filter(s => s.is_problematic).length;
  const activeSensors = activeSensorsData.filter(s => !s.is_problematic).length;

  const expiringSoon = activeSensorsData.filter(s => {
    const sensorModel = s.sensor_models || { duration_days: 10 };
    const expirationDate = new Date(s.date_added);
    expirationDate.setDate(expirationDate.getDate() + sensorModel.duration_days);
    const daysLeft = Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 2 && daysLeft > 0 && !s.is_problematic;
  }).length;

  // Calculate average wear time (using all sensors for historical data)
  const calculateAverageDuration = () => {
    if (sensors.length < 2) return 0;

    const durations: number[] = [];
    const sortedSensors = [...sensors].sort((a, b) => 
      new Date(a.date_added).getTime() - new Date(b.date_added).getTime()
    );

    for (let i = 0; i < sortedSensors.length - 1; i++) {
      const currentSensor = sortedSensors[i];
      const nextSensor = sortedSensors[i + 1];
      
      const startDate = new Date(currentSensor.date_added);
      const endDate = new Date(nextSensor.date_added);
      const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (duration >= 1 && duration <= 30) {
        durations.push(duration);
      }
    }

    return durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;
  };

  const averageWearTime = calculateAverageDuration();

  const getTimeUntilExpiration = (sensor: any) => {
    const sensorModel = sensor.sensor_models || { duration_days: 10 };
    const expirationDate = new Date(sensor.date_added);
    expirationDate.setDate(expirationDate.getDate() + sensorModel.duration_days);
    
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `${diffDays} days left`;
  };

  const getSensorStatus = (sensor: any) => {
    if (sensor.is_problematic) return 'error';
    
    const sensorModel = sensor.sensor_models || { duration_days: 10 };
    const expirationDate = new Date(sensor.date_added);
    expirationDate.setDate(expirationDate.getDate() + sensorModel.duration_days);
    const daysLeft = Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'error';
    if (daysLeft <= 2) return 'warning';
    return 'success';
  };

  const getSensorModelName = (sensor: any) => {
    if (sensor.sensor_models) {
      return `${sensor.sensor_models.manufacturer} ${sensor.sensor_models.model_name}`;
    }
    return 'Unknown Model';
  };

  const recentSensors = activeSensorsData.slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <TouchFriendlyButton
          variant="primary"
          size="lg"
          fullWidth
          icon={<Plus />}
          onClick={() => window.location.href = '/dashboard/sensors/new'}
        >
          Add Sensor
        </TouchFriendlyButton>
        
        <TouchFriendlyButton
          variant="outline"
          size="lg"
          fullWidth
          icon={<Camera />}
          onClick={() => window.location.href = '/dashboard/sensors'}
        >
          View All
        </TouchFriendlyButton>
      </div>



      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <MobileOptimizedCard
          title={totalSensors.toString()}
          subtitle="Total Sensors"
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          className="text-center"
        />
        
        <MobileOptimizedCard
          title={activeSensors.toString()}
          subtitle="Active Now"
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          status="success"
          className="text-center"
        />
        
        <MobileOptimizedCard
          title={expiringSoon.toString()}
          subtitle="Expiring Soon"
          icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
          status={expiringSoon > 0 ? 'warning' : 'success'}
          className="text-center"
        />
        
        <MobileOptimizedCard
          title={averageWearTime > 0 ? `${averageWearTime.toFixed(1)} days` : 'N/A'}
          subtitle="Avg. Wear Time"
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          className="text-center"
        />
      </div>

      {/* Recent Sensors */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Recent Sensors
          </h2>
          <div className="flex items-center space-x-2">
            <TouchFriendlyButton
              variant="ghost"
              size="sm"
              icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => fetchSensors(true)}
              disabled={refreshing}
            >
              Refresh
            </TouchFriendlyButton>
            <TouchFriendlyButton
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/dashboard/sensors'}
            >
              View All
            </TouchFriendlyButton>
          </div>
        </div>
        
        <div className="space-y-3">
          {recentSensors.length === 0 ? (
            <MobileOptimizedCard
              title="No sensors yet"
              subtitle="Add your first sensor to get started"
              icon={<Plus className="w-5 h-5 text-gray-400" />}
              onClick={() => window.location.href = '/dashboard/sensors/new'}
            />
          ) : (
            recentSensors.map((sensor) => (
              <MobileOptimizedCard
                key={sensor.id}
                title={getSensorModelName(sensor)}
                subtitle={getTimeUntilExpiration(sensor)}
                icon={<Activity className="w-5 h-5 text-blue-600" />}
                status={getSensorStatus(sensor)}
                badge={activeSensors > 0 && getSensorStatus(sensor) === 'success' ? 'Active' : 
                       sensor.is_problematic ? 'Issue' : 'Inactive'}
                onClick={() => window.location.href = `/dashboard/sensors/${sensor.id}`}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-gray-600 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>Added {new Date(sensor.date_added).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {sensor.is_problematic && (
                    <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs">Issue</span>
                    </div>
                  )}
                </div>
              </MobileOptimizedCard>
            ))
          )}
        </div>
      </div>

      {/* Quick Insights */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Quick Insights
        </h2>
        
        <div className="space-y-3">
          {totalSensors > 1 && (
            <MobileOptimizedCard
              title="Performance Tracking"
              subtitle={`${((totalSensors - problematicSensors) / totalSensors * 100).toFixed(0)}% success rate with ${totalSensors} sensors`}
              icon={<TrendingUp className="w-5 h-5 text-green-600" />}
              status="success"
            />
          )}
          
          {expiringSoon > 0 && (
            <MobileOptimizedCard
              title="Reminder: Check Expiration"
              subtitle={`${expiringSoon} sensor${expiringSoon > 1 ? 's' : ''} expiring soon`}
              icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
              status="warning"
              onClick={() => window.location.href = '/dashboard/sensors'}
            />
          )}
          
          {totalSensors > 0 && (
            <MobileOptimizedCard
              title="Analytics Available"
              subtitle="View detailed performance reports"
              icon={<Zap className="w-5 h-5 text-purple-600" />}
              onClick={() => window.location.href = '/dashboard/analytics'}
            />
          )}

          {userStats && userStats.current_streak > 0 && (
            <MobileOptimizedCard
              title={`${userStats.current_streak} Day Streak`}
              subtitle="Keep up the great tracking!"
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              status="success"
            />
          )}
        </div>
      </div>

      {/* Bottom Spacing for Mobile Navigation */}
      <div className="h-4 lg:hidden"></div>
    </div>
  );
}