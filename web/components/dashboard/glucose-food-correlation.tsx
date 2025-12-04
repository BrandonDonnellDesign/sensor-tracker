'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Target,
  Clock
} from 'lucide-react';

interface GlucoseFoodEvent {
  timestamp: string;
  glucose_value?: number;
  food_name?: string;
  meal_type?: string | null;
  calories?: number | null;
  carbs?: number | null;
  event_type: 'glucose' | 'food';
}

interface CorrelationInsight {
  food_name: string;
  avg_glucose_impact: number;
  peak_time_minutes: number;
  frequency: number;
  avg_carbs: number;
}

export function GlucoseFoodCorrelation() {
  const { user } = useAuth();
  const [events, setEvents] = useState<GlucoseFoodEvent[]>([]);
  const [insights, setInsights] = useState<CorrelationInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (!user?.id) return;
    
    fetchCorrelationData();
  }, [user?.id, timeRange]);

  const fetchCorrelationData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const supabase = createClient();
      const now = new Date();
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720; // 24h, 7d, 30d
      const startTime = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));

      // Fetch glucose readings
      const { data: glucoseData } = await supabase
        .from('glucose_readings')
        .select('*')
        .eq('user_id', user.id)
        .gte('display_time', startTime.toISOString())
        .order('display_time', { ascending: true });

      // Fetch food logs
      const { data: foodData } = await supabase
        .from('food_logs')
        .select(`
          *,
          food_items (
            product_name,
            brand
          )
        `)
        .eq('user_id', user.id)
        .gte('logged_at', startTime.toISOString())
        .order('logged_at', { ascending: true });

      // Combine and sort events
      const combinedEvents: GlucoseFoodEvent[] = [
        ...(glucoseData || []).map(reading => ({
          timestamp: reading.display_time || reading.system_time,
          glucose_value: reading.value,
          event_type: 'glucose' as const
        })),
        ...(foodData || []).map(log => ({
          timestamp: log.logged_at,
          food_name: log.food_items?.product_name || 'Unknown Food',
          meal_type: log.meal_type,
          calories: log.total_calories,
          carbs: log.total_carbs_g,
          event_type: 'food' as const
        }))
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setEvents(combinedEvents);
      
      // Calculate insights
      calculateInsights(combinedEvents);
      
    } catch (error) {
      console.error('Error fetching correlation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateInsights = (events: GlucoseFoodEvent[]) => {
    const foodInsights: Record<string, {
      glucose_impacts: number[];
      peak_times: number[];
      carbs_values: number[];
      frequency: number;
    }> = {};

    // Group events and calculate impacts
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (event.event_type === 'food' && event.food_name) {
        if (!foodInsights[event.food_name]) {
          foodInsights[event.food_name] = {
            glucose_impacts: [],
            peak_times: [],
            carbs_values: [],
            frequency: 0
          };
        }
        
        foodInsights[event.food_name].frequency++;
        if (event.carbs) {
          foodInsights[event.food_name].carbs_values.push(event.carbs);
        }

        // Look for glucose readings in the next 2 hours
        const foodTime = new Date(event.timestamp).getTime();
        const twoHoursLater = foodTime + (2 * 60 * 60 * 1000);
        
        let baselineGlucose = null;
        let peakGlucose = null;
        let peakTime = null;

        // Find baseline (reading just before food)
        for (let j = i - 1; j >= 0; j--) {
          const prevEvent = events[j];
          if (prevEvent.event_type === 'glucose' && prevEvent.glucose_value) {
            const timeDiff = foodTime - new Date(prevEvent.timestamp).getTime();
            if (timeDiff <= 30 * 60 * 1000) { // Within 30 minutes before
              baselineGlucose = prevEvent.glucose_value;
              break;
            }
          }
        }

        // Find peak glucose after food
        for (let j = i + 1; j < events.length; j++) {
          const nextEvent = events[j];
          if (nextEvent.event_type === 'glucose' && nextEvent.glucose_value) {
            const eventTime = new Date(nextEvent.timestamp).getTime();
            if (eventTime > twoHoursLater) break;
            
            if (!peakGlucose || nextEvent.glucose_value > peakGlucose) {
              peakGlucose = nextEvent.glucose_value;
              peakTime = (eventTime - foodTime) / (60 * 1000); // minutes
            }
          }
        }

        if (baselineGlucose && peakGlucose) {
          const impact = peakGlucose - baselineGlucose;
          foodInsights[event.food_name].glucose_impacts.push(impact);
          if (peakTime) {
            foodInsights[event.food_name].peak_times.push(peakTime);
          }
        }
      }
    }

    // Convert to insights array
    const insightsArray: CorrelationInsight[] = Object.entries(foodInsights)
      .filter(([_, data]) => data.glucose_impacts.length > 0)
      .map(([food_name, data]) => ({
        food_name,
        avg_glucose_impact: data.glucose_impacts.reduce((a, b) => a + b, 0) / data.glucose_impacts.length,
        peak_time_minutes: data.peak_times.length > 0 
          ? data.peak_times.reduce((a, b) => a + b, 0) / data.peak_times.length 
          : 0,
        frequency: data.frequency,
        avg_carbs: data.carbs_values.length > 0 
          ? data.carbs_values.reduce((a, b) => a + b, 0) / data.carbs_values.length 
          : 0
      }))
      .sort((a, b) => Math.abs(b.avg_glucose_impact) - Math.abs(a.avg_glucose_impact));

    setInsights(insightsArray);
  };

  // Group food events by meal
  const groupFoodEventsByMeal = (events: GlucoseFoodEvent[]) => {
    const foodEvents = events.filter(e => e.event_type === 'food');
    const mealGroups: Array<{
      timestamp: string;
      meal_type: string | null;
      foods: string[];
      total_carbs: number;
      total_calories: number;
      count: number;
    }> = [];

    // Group food events within 30 minutes of each other with same meal type
    foodEvents.forEach(event => {
      const eventTime = new Date(event.timestamp).getTime();
      
      // Find existing group within 30 minutes with same meal type
      const existingGroup = mealGroups.find(group => {
        const groupTime = new Date(group.timestamp).getTime();
        const timeDiff = Math.abs(eventTime - groupTime);
        return timeDiff <= 30 * 60 * 1000 && group.meal_type === event.meal_type;
      });

      if (existingGroup) {
        // Add to existing group
        if (event.food_name && !existingGroup.foods.includes(event.food_name)) {
          existingGroup.foods.push(event.food_name);
        }
        existingGroup.total_carbs += event.carbs || 0;
        existingGroup.total_calories += event.calories || 0;
        existingGroup.count++;
        
        // Use the earliest timestamp for the group
        if (eventTime < new Date(existingGroup.timestamp).getTime()) {
          existingGroup.timestamp = event.timestamp;
        }
      } else {
        // Create new group
        mealGroups.push({
          timestamp: event.timestamp,
          meal_type: event.meal_type || null,
          foods: event.food_name ? [event.food_name] : [],
          total_carbs: event.carbs || 0,
          total_calories: event.calories || 0,
          count: 1
        });
      }
    });

    return mealGroups;
  };

  // Prepare timeline data for chart
  const mealGroups = groupFoodEventsByMeal(events);
  
  // Create timeline data with grouped meals
  const glucoseEvents = events.filter(e => e.event_type === 'glucose').map(event => ({
    time: new Date(event.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }),
    timestamp: new Date(event.timestamp).getTime(),
    glucose: event.glucose_value,
    food: null,
    carbs: null,
    meal_type: null,
    isFoodEvent: false,
    mealGroup: null
  }));

  const mealEvents = mealGroups.map(group => ({
    time: new Date(group.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }),
    timestamp: new Date(group.timestamp).getTime(),
    glucose: 100, // Fixed Y position for food events - will be overridden by custom dot
    food: group.foods.length > 1 ? `${group.foods[0]} +${group.foods.length - 1} more` : group.foods[0],
    carbs: group.total_carbs,
    meal_type: group.meal_type,
    isFoodEvent: true,
    mealGroup: group
  }));

  const timelineData = [...glucoseEvents, ...mealEvents].sort((a, b) => a.timestamp - b.timestamp);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Glucose & Food Correlation
        </h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Glucose & Food Timeline
          </h3>
          <div className="text-sm text-gray-600 dark:text-slate-400">
            {events.filter(e => e.event_type === 'glucose').length} glucose readings • {events.filter(e => e.event_type === 'food').length} food events
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                domain={['dataMin - 20', 'dataMax + 20']}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg max-w-sm">
                        <p className="text-white font-medium">{label}</p>
                        {data.glucose && !data.isFoodEvent && (
                          <p className="text-blue-400">
                            Glucose: {data.glucose} mg/dL
                          </p>
                        )}
                        {data.mealGroup && (
                          <div className="text-green-400">
                            <p className="font-medium">
                              {data.meal_type ? data.meal_type.charAt(0).toUpperCase() + data.meal_type.slice(1) : 'Meal'} 
                              {data.mealGroup.count > 1 && ` (${data.mealGroup.count} items)`}
                            </p>
                            <div className="mt-1 space-y-1">
                              {data.mealGroup.foods.slice(0, 3).map((food: string, i: number) => (
                                <p key={i} className="text-sm truncate" title={food}>• {food}</p>
                              ))}
                              {data.mealGroup.foods.length > 3 && (
                                <p className="text-sm text-green-300">
                                  • +{data.mealGroup.foods.length - 3} more items
                                </p>
                              )}
                            </div>
                            <div className="mt-2 text-sm">
                              {data.mealGroup.total_carbs > 0 && <p>Total Carbs: {Math.round(data.mealGroup.total_carbs)}g</p>}
                              {data.mealGroup.total_calories > 0 && <p>Total Calories: {Math.round(data.mealGroup.total_calories)}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={70} stroke="#10B981" strokeDasharray="2 2" label="Target Low" />
              <ReferenceLine y={180} stroke="#F59E0B" strokeDasharray="2 2" label="Target High" />
              
              {/* Glucose line */}
              <Line
                type="monotone"
                dataKey="glucose"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={({ cx, cy, payload, index }) => {
                  // Type guard for cx and cy
                  if (cx === undefined || cy === undefined) return null;
                  
                  // Show different markers for glucose vs food events
                  if (payload.isFoodEvent && payload.mealGroup) {
                    // Position food events at the bottom of the chart
                    const foodY = 320; // Near bottom of 320px chart height
                    const itemCount = payload.mealGroup.count;
                    
                    // Scale marker size based on number of items (1-5 items)
                    const baseSize = 8;
                    const maxSize = 16;
                    const size = Math.min(baseSize + (itemCount - 1) * 2, maxSize);
                    
                    return (
                      <g key={`meal-${index}`}>
                        {/* Meal marker - triangle pointing up, size based on item count */}
                        <polygon
                          points={`${cx},${foodY-size-4} ${cx-size},${foodY} ${cx+size},${foodY}`}
                          fill="#10B981"
                          stroke="#059669"
                          strokeWidth={2}
                        />
                        
                        {/* Show item count if more than 1 */}
                        {itemCount > 1 && (
                          <text
                            x={cx}
                            y={foodY - 2}
                            textAnchor="middle"
                            fontSize="10"
                            fill="white"
                            fontWeight="bold"
                          >
                            {itemCount}
                          </text>
                        )}
                        
                        {/* Optional: Add a vertical line to connect to timeline */}
                        <line
                          x1={cx}
                          y1={foodY - size - 4}
                          x2={cx}
                          y2={foodY - 40}
                          stroke="#10B981"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.5}
                        />
                      </g>
                    );
                  } else if (payload.glucose && !payload.isFoodEvent) {
                    return (
                      <circle
                        key={`glucose-${index}`}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="#3B82F6"
                        stroke="#1D4ED8"
                        strokeWidth={2}
                      />
                    );
                  }
                  // Return empty group for invalid cases
                  return <g key={`empty-${index}`}></g>;
                }}
                connectNulls={false}
                name="Timeline"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Glucose Readings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-green-500"></div>
            <span>Meals (size = # of items)</span>
          </div>
        </div>
      </div>

      {/* Food Impact Insights */}
      {insights.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Food Impact Analysis
          </h3>
          <div className="space-y-4">
            {insights.slice(0, 8).map((insight) => {
              const impactColor = insight.avg_glucose_impact > 30 ? 'text-red-500' : 
                                 insight.avg_glucose_impact > 15 ? 'text-yellow-500' : 'text-green-500';
              const impactIcon = insight.avg_glucose_impact > 30 ? AlertTriangle : 
                               insight.avg_glucose_impact > 15 ? TrendingUp : Target;
              const IconComponent = impactIcon;
              
              return (
                <div key={insight.food_name} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconComponent className={`w-5 h-5 ${impactColor} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-slate-100 truncate" title={insight.food_name}>
                        {insight.food_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                        {insight.frequency} times logged • {Math.round(insight.avg_carbs)}g avg carbs
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold ${impactColor}`}>
                      {insight.avg_glucose_impact > 0 ? '+' : ''}{Math.round(insight.avg_glucose_impact)} mg/dL
                    </p>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>Peak: {Math.round(insight.peak_time_minutes)}min</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {insights.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-slate-400">
                Not enough data to show correlations. Keep logging food and glucose readings!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Understanding Your Data
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Foods with high carbs typically cause larger glucose spikes</li>
          <li>• Peak glucose usually occurs 30-90 minutes after eating</li>
          <li>• Individual responses vary - track your personal patterns</li>
          <li>• Consider portion sizes and meal timing for better control</li>
          <li>• Green triangles show meals (larger = more food items)</li>
          <li>• Blue circles show glucose readings from your CGM</li>
          <li>• Foods logged within 30 minutes are grouped as one meal</li>
        </ul>
      </div>
    </div>
  );
}