'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';
import { Loader2, Trash2, Calendar, Edit2, Plus } from 'lucide-react';
import { FoodLogEditForm } from './food-log-edit-form';
import { FavoriteButton } from './favorite-button';
import { useDateTimeFormatter } from '@/utils/date-formatter';

interface FoodLogListProps {
  userId?: string;
}

export function FoodLogList({ userId }: FoodLogListProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDayInsulin, setTotalDayInsulin] = useState(0);
  // Get today's date in local timezone
  const today = new Date();
  const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState(localDateString);
  const [editingLog, setEditingLog] = useState<any>(null);
  const dateFormatter = useDateTimeFormatter();

  useEffect(() => {
    if (!userId) return;
    loadLogs();
    loadDayInsulin();
  }, [userId, selectedDate]);

  const loadLogs = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      // Get all logs for the user and filter client-side by local date
      // This ensures we capture logs that might cross timezone boundaries
      const { data, error } = await (supabase as any)
        .from('food_logs_with_cgm')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });

      if (error) throw error;

      // Filter by selected date in local timezone
      const filteredLogs = (data || []).filter((log: any) => {
        const logDate = new Date(log.logged_at);
        const logLocalDate = logDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        return logLocalDate === selectedDate;
      });

      setLogs(filteredLogs);

    } catch (error) {
      logger.error('Error loading food logs:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDayInsulin = async () => {
    if (!userId) return;

    try {
      const supabase = createClient();

      // Get start and end of selected date in local timezone
      const startOfDay = new Date(selectedDate + 'T00:00:00');
      const endOfDay = new Date(selectedDate + 'T23:59:59');

      // Get all insulin logs for the selected date
      const { data, error } = await supabase
        .from('all_insulin_delivery')
        .select('units, delivery_type')
        .eq('user_id', userId)
        .gte('taken_at', startOfDay.toISOString())
        .lte('taken_at', endOfDay.toISOString())
        .in('delivery_type', ['bolus', 'meal', 'correction']); // Only bolus insulin

      if (error) throw error;

      // Calculate total bolus insulin for the day
      const total = (data || []).reduce((sum, log) => sum + (log.units || 0), 0);
      setTotalDayInsulin(total);

    } catch (error) {
      logger.error('Error loading day insulin:', error);
      setTotalDayInsulin(0);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Delete this food log?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      loadLogs();
    } catch (error) {
      logger.error('Error deleting log:', error);
    }
  };

  const handleLogAgain = async (originalLog: any) => {
    if (!userId) return;

    try {
      const supabase = createClient();

      // Create a new log entry with the same food and serving details
      // Don't copy the totals - let the system recalculate them
      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: userId,
          food_item_id: originalLog.food_item_id,
          serving_size: originalLog.serving_size,
          serving_unit: originalLog.serving_unit || 'g',
          user_serving_size: originalLog.user_serving_size || null,
          user_serving_unit: originalLog.user_serving_unit || null,
          // Remove the pre-calculated totals - they will be recalculated
          // total_carbs_g: originalLog.total_carbs_g || null,
          // total_calories: originalLog.total_calories || null,
          // total_protein_g: originalLog.total_protein_g || null,
          // total_fat_g: originalLog.total_fat_g || null,
          meal_type: 'snack', // Default to snack, user can edit if needed
          logged_at: new Date().toISOString(),
        } as any); // Type assertion to bypass TypeScript issues

      if (error) throw error;
      loadLogs();
      loadDayInsulin();
    } catch (error) {
      logger.error('Error logging food again:', error);
      alert('Failed to log food again. Please try again.');
    }
  };

  const getTotalNutrition = () => {
    return logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (Number(log.total_calories) || 0),
        carbs: acc.carbs + (Number(log.total_carbs_g) || 0),
        protein: acc.protein + (Number(log.total_protein_g) || 0),
        fat: acc.fat + (Number(log.total_fat_g) || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );
  };

  const totals = getTotalNutrition();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (editingLog) {
    return (
      <FoodLogEditForm
        log={editingLog}
        onCancel={() => setEditingLog(null)}
        onSuccess={() => {
          setEditingLog(null);
          loadLogs();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Daily Summary - Carbs Prominent */}
      {logs.length > 0 && (
        <div className="bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Daily Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Carbs - Most Prominent */}
            <div className="text-center p-6 bg-blue-900/30 border-2 border-blue-700 rounded-lg">
              <p className="text-sm font-medium text-blue-400 mb-1">Total Carbohydrates</p>
              <p className="text-5xl font-bold text-blue-300">
                {totals.carbs.toFixed(1)}<span className="text-2xl">g</span>
              </p>
            </div>

            {/* Other Macros */}
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">Calories</p>
              <p className="text-3xl font-bold text-white">
                {totals.calories.toFixed(0)}
              </p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">Protein</p>
              <p className="text-3xl font-bold text-white">
                {totals.protein.toFixed(1)}g
              </p>
            </div>
          </div>

          {/* Daily Summary - Glucose & Insulin */}
          {(() => {
            const mealsWithCGM = logs.filter(log => log.cgm_1hr_post_meal || log.cgm_2hr_post_meal);
            const mealsWithInsulin = logs.filter(log => log.total_insulin_units > 0);
            const totalInsulin = logs.reduce((sum, log) => sum + (log.total_insulin_units || 0), 0);

            if (mealsWithCGM.length === 0 && mealsWithInsulin.length === 0) return null;

            const avgPeak = mealsWithCGM.length > 0 ? mealsWithCGM.reduce((sum, log) => {
              const peak = Math.max(log.cgm_1hr_post_meal || 0, log.cgm_2hr_post_meal || 0);
              return sum + peak;
            }, 0) / mealsWithCGM.length : 0;

            const highReadings = mealsWithCGM.filter(log =>
              (log.cgm_1hr_post_meal && log.cgm_1hr_post_meal > 180) ||
              (log.cgm_2hr_post_meal && log.cgm_2hr_post_meal > 180)
            ).length;

            return (
              <div className="mt-4 p-4 bg-gradient-to-r from-slate-800/40 to-slate-700/40 rounded-lg border border-slate-600/40">
                <h4 className="text-sm font-medium text-slate-200 mb-4 flex items-center gap-2">
                  📈 Daily Insights
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Glucose Summary */}
                  {mealsWithCGM.length > 0 && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <h5 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1">
                        📊 Glucose Impact
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Avg Peak:</span>
                          <span className={`font-semibold ${avgPeak > 180 ? 'text-orange-400' : avgPeak > 140 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                            {avgPeak.toFixed(0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">High Readings:</span>
                          <span className={`font-semibold ${highReadings > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                            {highReadings}/{mealsWithCGM.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insulin Summary */}
                  {mealsWithInsulin.length > 0 && (
                    <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-700/30">
                      <h5 className="text-xs font-medium text-orange-200 mb-2 flex items-center gap-1">
                        💉 Insulin Usage
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-orange-300">Total Bolus:</span>
                          <span className="font-semibold text-orange-200">
                            {totalDayInsulin.toFixed(1)}U
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-300">Coverage:</span>
                          <span className="font-semibold text-orange-200">
                            {mealsWithInsulin.length}/{logs.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-300">I:C Ratio:</span>
                          <span className="font-semibold text-orange-200">
                            {totalInsulin > 0 && totals.carbs > 0
                              ? `1:${(totals.carbs / totalInsulin).toFixed(1)}`
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nutrition Summary */}
                  <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-700/30">
                    <h5 className="text-xs font-medium text-blue-200 mb-2 flex items-center gap-1">
                      🍽️ Nutrition
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-300">Carbs:</span>
                        <span className="font-semibold text-blue-200">
                          {totals.carbs.toFixed(1)}g
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-300">Calories:</span>
                        <span className="font-semibold text-blue-200">
                          {totals.calories.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-300">Protein:</span>
                        <span className="font-semibold text-blue-200">
                          {totals.protein.toFixed(1)}g
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Food Logs - Grouped by Meal */}
      <div className="space-y-6">
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30">
            <p className="text-slate-400">
              No food logged for this date
            </p>
          </div>
        ) : (
          (() => {
            // Group logs by time (within 30 minutes of each other)
            const timeGroups: any[] = [];
            const sortedLogs = [...logs].sort((a, b) =>
              new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
            );

            sortedLogs.forEach(log => {
              const logTime = new Date(log.logged_at).getTime();

              // Find a group within 30 minutes
              const existingGroup = timeGroups.find(group => {
                const groupTime = new Date(group.logs[0].logged_at).getTime();
                const timeDiff = Math.abs(logTime - groupTime);
                return timeDiff <= 30 * 60 * 1000; // 30 minutes in milliseconds
              });

              if (existingGroup) {
                existingGroup.logs.push(log);
              } else {
                timeGroups.push({
                  logs: [log],
                  time: log.logged_at,
                  mealType: log.meal_type
                });
              }
            });

            return timeGroups.map((group, index) => {
              const mealLogs = group.logs;

              // Calculate meal totals
              const mealTotals = mealLogs.reduce((acc: any, log: any) => ({
                calories: acc.calories + (Number(log.total_calories) || 0),
                carbs: acc.carbs + (Number(log.total_carbs_g) || 0),
                protein: acc.protein + (Number(log.total_protein_g) || 0),
                fat: acc.fat + (Number(log.total_fat_g) || 0),
              }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

              // Get CGM readings from the first log
              const firstLog = mealLogs[0];
              const hasCGM = firstLog.cgm_1hr_post_meal || firstLog.cgm_2hr_post_meal;

              return (
                <div key={`meal-${index}`} className="bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 overflow-hidden">
                  {/* Meal Header */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 border-b border-slate-600">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {group.mealType.charAt(0).toUpperCase() + group.mealType.slice(1)}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {dateFormatter.formatTime(new Date(group.time))}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        {/* Primary Metrics */}
                        <div className="flex gap-3 text-sm flex-wrap items-center">
                          <span className="px-3 py-1.5 bg-blue-900/40 text-blue-300 font-semibold rounded-lg border border-blue-700/30">
                            {mealTotals.carbs.toFixed(1)}g carbs
                          </span>
                          <span className="px-3 py-1.5 bg-slate-700/40 text-slate-300 rounded-lg">
                            {mealTotals.calories.toFixed(0)} cal
                          </span>
                        </div>

                        {/* Glucose Readings */}
                        {hasCGM && (
                          <div className="flex gap-2 text-sm">
                            {firstLog.cgm_1hr_post_meal && (
                              <span className="px-3 py-1.5 bg-green-900/40 text-green-300 rounded-lg border border-green-700/30">
                                1hr: {firstLog.cgm_1hr_post_meal} mg/dL
                              </span>
                            )}
                            {firstLog.cgm_2hr_post_meal && (
                              <span className="px-3 py-1.5 bg-green-900/40 text-green-300 rounded-lg border border-green-700/30">
                                2hr: {firstLog.cgm_2hr_post_meal} mg/dL
                              </span>
                            )}
                          </div>
                        )}

                        {/* Insulin Data */}
                        {firstLog.total_insulin_units > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {/* Insulin Dose */}
                            {firstLog.total_insulin_units > 0 && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-900/30 border border-orange-700/40 rounded-lg">
                                <span className="text-orange-200 text-xs font-medium">💉</span>
                                <span className="text-orange-200 font-semibold">
                                  {firstLog.total_insulin_units}U
                                </span>
                                {firstLog.insulin_dose && (() => {
                                  try {
                                    const insulinData = typeof firstLog.insulin_dose === 'string'
                                      ? JSON.parse(firstLog.insulin_dose)
                                      : firstLog.insulin_dose;
                                    return (
                                      <span className="text-orange-300 text-xs">
                                        {insulinData.insulin_name || 'Insulin'}
                                      </span>
                                    );
                                  } catch (e) {
                                    return (
                                      <span className="text-orange-300 text-xs">
                                        Insulin
                                      </span>
                                    );
                                  }
                                })()}
                              </div>
                            )}

                            {/* CGM Readings */}
                            {hasCGM && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/40 border border-slate-600/40 rounded-lg">
                                <span className="text-slate-300 text-xs font-medium">📊</span>
                                <div className="flex items-center gap-3">
                                  {firstLog.cgm_1hr_post_meal && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 text-xs">1h</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${firstLog.cgm_1hr_post_meal < 70
                                          ? 'bg-red-800/60 text-red-200' :
                                          firstLog.cgm_1hr_post_meal > 180
                                            ? 'bg-orange-800/60 text-orange-200' :
                                            'bg-green-800/60 text-green-200'
                                        }`}>
                                        {firstLog.cgm_1hr_post_meal}
                                      </span>
                                    </div>
                                  )}
                                  {firstLog.cgm_2hr_post_meal && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 text-xs">2h</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${firstLog.cgm_2hr_post_meal < 70
                                          ? 'bg-red-800/60 text-red-200' :
                                          firstLog.cgm_2hr_post_meal > 180
                                            ? 'bg-orange-800/60 text-orange-200' :
                                            'bg-green-800/60 text-green-200'
                                        }`}>
                                        {firstLog.cgm_2hr_post_meal}
                                      </span>
                                    </div>
                                  )}
                                  {/* Trend indicator */}
                                  {firstLog.cgm_1hr_post_meal && firstLog.cgm_2hr_post_meal && (
                                    <span className={`text-sm ${firstLog.cgm_2hr_post_meal < firstLog.cgm_1hr_post_meal
                                        ? 'text-green-400' :
                                        firstLog.cgm_2hr_post_meal > firstLog.cgm_1hr_post_meal
                                          ? 'text-orange-400' : 'text-slate-400'
                                      }`}>
                                      {firstLog.cgm_2hr_post_meal < firstLog.cgm_1hr_post_meal ? '↓' :
                                        firstLog.cgm_2hr_post_meal > firstLog.cgm_1hr_post_meal ? '↑' : '→'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meal Items */}
                  <div className="divide-y divide-slate-700/50">
                    {mealLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Always reserve space for image to maintain alignment */}
                          <div className="w-16 h-16 flex-shrink-0">
                            {log.image_url ? (
                              <img
                                src={log.image_url}
                                alt={log.product_name || log.custom_food_name}
                                className="w-full h-full object-cover rounded border border-slate-600"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-700/50 border border-slate-600 rounded flex items-center justify-center">
                                <span className="text-slate-500 text-2xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-white">
                                  {log.custom_food_name || log.product_name}
                                </h4>
                                <p className="text-sm text-slate-400">
                                  {log.user_serving_size && log.user_serving_unit
                                    ? `${log.user_serving_size} ${log.user_serving_unit}`
                                    : `${log.serving_size} g`
                                  }
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {dateFormatter.formatTime(log.logged_at)}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <div title="Add to favorites">
                                  <FavoriteButton
                                    foodId={log.food_item_id}
                                    foodName={log.custom_food_name || log.product_name}
                                    defaultServingSize={log.user_serving_size || log.serving_size}
                                    defaultServingUnit={log.user_serving_unit || log.serving_unit}
                                    className="p-1.5"
                                  />
                                </div>
                                <button
                                  onClick={() => handleLogAgain(log)}
                                  className="p-2 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Log this food again"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingLog(log)}
                                  className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title="Edit food log"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(log.id)}
                                  className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Delete food log"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2 text-sm flex-wrap">
                              <span className="px-2.5 py-1 bg-blue-900/40 text-blue-300 font-semibold rounded-lg text-xs">
                                {Number(log.total_carbs_g).toFixed(1)}g carbs
                              </span>
                              <span className="px-2.5 py-1 bg-slate-700/40 text-slate-300 rounded-lg text-xs">
                                {Number(log.total_calories).toFixed(0)} cal
                              </span>
                              {log.total_protein_g && (
                                <span className="px-2.5 py-1 bg-slate-700/40 text-slate-300 rounded-lg text-xs">
                                  {Number(log.total_protein_g).toFixed(1)}g protein
                                </span>
                              )}
                            </div>
                            {log.notes && (
                              <p className="text-sm text-slate-400 mt-2 italic">
                                {log.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }).filter(Boolean);
          })()
        )}
      </div>
    </div>
  );
}
