'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { useDateTimeFormatter } from '@/utils/date-formatter';
import {
  Plus,
  AlertTriangle,
  Clock,
  Award,
  Calendar,
  ChevronRight,
  Activity,
  UtensilsCrossed,
} from 'lucide-react';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensor_models?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
};

interface ActivityItem {
  id: string;
  type:
    | 'sensor_added'
    | 'sensor_expired'
    | 'sensor_issue'
    | 'achievement'
    | 'upcoming_expiry'
    | 'food_logged';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
  href?: string;
  metadata?: any;
}

interface ActivityTimelineProps {
  sensors: Sensor[];
  userAchievements?: any[];
}

export function ActivityTimeline({
  sensors,
  userAchievements = [],
}: ActivityTimelineProps) {
  const { user } = useAuth();
  const dateFormatter = useDateTimeFormatter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    generateActivities();
  }, [sensors, userAchievements]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateActivities = async () => {
    const activityItems: ActivityItem[] = [];

    // Fetch recent food logs (last 7 days)
    if (user?.id) {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: foodLogs } = await supabase
          .from('food_logs')
          .select(
            `
            *,
            food_items (
              product_name,
              brand
            )
          `
          )
          .eq('user_id', user.id)
          .gte('logged_at', weekAgo.toISOString())
          .order('logged_at', { ascending: false })
          .limit(10);

        if (foodLogs) {
          foodLogs.forEach((log) => {
            const foodName =
              log.custom_food_name || log.food_items?.product_name || 'Food';
            const carbs = log.total_carbs_g
              ? `${Number(log.total_carbs_g).toFixed(1)}g carbs`
              : '';
            const mealType = log.meal_type
              ? log.meal_type.charAt(0).toUpperCase() + log.meal_type.slice(1)
              : 'Meal';

            activityItems.push({
              id: `food-logged-${log.id}`,
              type: 'food_logged',
              title: `${mealType} logged`,
              description: `${foodName}${carbs ? ` - ${carbs}` : ''}`,
              timestamp: new Date(log.logged_at),
              icon: <UtensilsCrossed className='w-4 h-4' />,
              color: 'bg-blue-500',
              href: '/dashboard/food',
            });
          });
        }
      } catch (error) {
        console.error('Error fetching food logs:', error);
      }
    }

    // Recent sensor additions (last 7 days)
    const recentSensors = sensors
      .filter((sensor) => {
        const addedDate = new Date(sensor.date_added);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return addedDate >= weekAgo;
      })
      .sort(
        (a, b) =>
          new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
      );

    recentSensors.forEach((sensor) => {
      activityItems.push({
        id: `sensor-added-${sensor.id}`,
        type: 'sensor_added',
        title: 'New sensor added',
        description: `${sensor.sensor_models?.manufacturer || 'Unknown'} ${
          sensor.sensor_models?.model_name || 'sensor'
        } - ${sensor.serial_number}`,
        timestamp: new Date(sensor.date_added),
        icon: <Plus className='w-4 h-4' />,
        color: 'bg-green-500',
        href: `/dashboard/sensors/${sensor.id}`,
      });
    });

    // Problematic sensors
    const problematicSensors = sensors.filter(
      (sensor) => sensor.is_problematic
    );
    problematicSensors.forEach((sensor) => {
      activityItems.push({
        id: `sensor-issue-${sensor.id}`,
        type: 'sensor_issue',
        title: 'Sensor issue reported',
        description: `${sensor.serial_number} needs attention`,
        timestamp: new Date(sensor.updated_at || sensor.date_added),
        icon: <AlertTriangle className='w-4 h-4' />,
        color: 'bg-red-500',
        href: `/dashboard/sensors/${sensor.id}`,
      });
    });

    // Upcoming expirations (next 3 days)
    const upcomingExpirations = sensors
      .filter((sensor) => {
        if (sensor.is_problematic) return false;

        const sensorModel = sensor.sensor_models || { duration_days: 10 };
        const expirationDate = new Date(sensor.date_added);
        expirationDate.setDate(
          expirationDate.getDate() + sensorModel.duration_days
        );

        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        return expirationDate > now && expirationDate <= threeDaysFromNow;
      })
      .sort((a, b) => {
        const aExp = new Date(a.date_added);
        aExp.setDate(aExp.getDate() + (a.sensor_models?.duration_days || 10));
        const bExp = new Date(b.date_added);
        bExp.setDate(bExp.getDate() + (b.sensor_models?.duration_days || 10));
        return aExp.getTime() - bExp.getTime();
      });

    upcomingExpirations.forEach((sensor) => {
      const sensorModel = sensor.sensor_models || { duration_days: 10 };
      const expirationDate = new Date(sensor.date_added);
      expirationDate.setDate(
        expirationDate.getDate() + sensorModel.duration_days
      );

      const now = new Date();
      const hoursLeft = Math.floor(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      activityItems.push({
        id: `sensor-expiring-${sensor.id}`,
        type: 'upcoming_expiry',
        title: 'Sensor expiring soon',
        description: `${sensor.serial_number} expires in ${
          hoursLeft < 24
            ? `${hoursLeft} hours`
            : `${Math.ceil(hoursLeft / 24)} days`
        }`,
        timestamp: expirationDate,
        icon: <Clock className='w-4 h-4' />,
        color: 'bg-yellow-500',
        href: `/dashboard/sensors/${sensor.id}`,
      });
    });

    // Recent achievements (last 30 days)
    const recentAchievements = userAchievements
      .filter((achievement) => {
        const earnedDate = new Date(achievement.earned_at);
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return earnedDate >= monthAgo;
      })
      .sort(
        (a, b) =>
          new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime()
      );

    recentAchievements.forEach((achievement) => {
      activityItems.push({
        id: `achievement-${achievement.id}`,
        type: 'achievement',
        title: 'Achievement unlocked!',
        description: `${achievement.achievement.icon} ${achievement.achievement.name}`,
        timestamp: new Date(achievement.earned_at),
        icon: <Award className='w-4 h-4' />,
        color: 'bg-purple-500',
        metadata: achievement,
      });
    });

    // Sort all activities by timestamp (most recent first)
    activityItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setActivities(activityItems);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return dateFormatter.formatDate(date);
  };

  const displayedActivities = showAll ? activities : activities.slice(0, 5);

  if (activities.length === 0) {
    return (
      <div className='bg-[#1e293b] rounded-lg p-6 border border-slate-700/30'>
        <div className='flex items-center space-x-3 mb-6'>
          <div className='w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
            <Activity className='w-5 h-5 text-white' />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              Recent Activity
            </h3>
            <p className='text-sm text-gray-600 dark:text-slate-400'>
              Your sensor tracking timeline
            </p>
          </div>
        </div>

        <div className='text-center py-8'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Activity className='w-8 h-8 text-gray-400' />
          </div>
          <p className='text-gray-500 dark:text-slate-400 mb-2'>
            No recent activity
          </p>
          <p className='text-sm text-gray-400 dark:text-slate-500'>
            Start tracking sensors to see your activity timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-[#1e293b] rounded-lg p-6 border border-slate-700/30'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center space-x-3'>
          <div className='w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
            <Activity className='w-5 h-5 text-white' />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              Recent Activity
            </h3>
            <p className='text-sm text-gray-600 dark:text-slate-400'>
              Your sensor tracking timeline
            </p>
          </div>
        </div>

        {activities.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium'>
            {showAll ? 'Show Less' : `View All (${activities.length})`}
          </button>
        )}
      </div>

      <div className='space-y-4'>
        {displayedActivities.map((activity, index) => (
          <div key={activity.id} className='relative'>
            {/* Timeline line */}
            {index < displayedActivities.length - 1 && (
              <div className='absolute left-6 top-12 w-0.5 h-8 bg-gray-200 dark:bg-slate-600'></div>
            )}

            <div className='flex items-start space-x-4'>
              {/* Icon */}
              <div
                className={`${activity.color} rounded-full p-2 text-white flex-shrink-0`}>
                {activity.icon}
              </div>

              {/* Content */}
              <div className='flex-1 min-w-0'>
                {activity.href ? (
                  <Link href={activity.href} className='block group'>
                    <div className='flex items-center justify-between'>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                          {activity.title}
                        </p>
                        <p className='text-sm text-gray-600 dark:text-slate-400 truncate'>
                          {activity.description}
                        </p>
                      </div>
                      <div className='flex items-center space-x-2 flex-shrink-0 ml-4'>
                        <span className='text-xs text-gray-500 dark:text-slate-500'>
                          {getTimeAgo(activity.timestamp)}
                        </span>
                        <ChevronRight className='w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors' />
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className='flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 dark:text-slate-100'>
                        {activity.title}
                      </p>
                      <p className='text-sm text-gray-600 dark:text-slate-400 truncate'>
                        {activity.description}
                      </p>
                    </div>
                    <span className='text-xs text-gray-500 dark:text-slate-500 flex-shrink-0 ml-4'>
                      {getTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className='mt-6 pt-6 border-t border-gray-200 dark:border-slate-600'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Link
              href='/dashboard/sensors'
              className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium'>
              View all sensors →
            </Link>
            <Link
              href='/dashboard/food'
              className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium'>
              View food log →
            </Link>
            <Link
              href='/dashboard/analytics'
              className='text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium'>
              View analytics →
            </Link>
          </div>
          <div className='text-xs text-gray-500 dark:text-slate-500'>
            <Calendar className='w-3 h-3 inline mr-1' />
            Updated just now
          </div>
        </div>
      </div>
    </div>
  );
}
