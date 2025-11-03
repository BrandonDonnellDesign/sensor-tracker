'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
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
  // Get today's date in local timezone
  const today = new Date();
  const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState(localDateString);
  const [editingLog, setEditingLog] = useState<any>(null);
  const dateFormatter = useDateTimeFormatter();

  useEffect(() => {
    if (!userId) return;
    loadLogs();
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
      console.error('Error loading food logs:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
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
      console.error('Error deleting log:', error);
    }
  };

  const handleLogAgain = async (originalLog: any) => {
    if (!userId) return;
    
    try {
      const supabase = createClient();
      
      // Create a new log entry with the same food and serving details
      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: userId,
          food_item_id: originalLog.food_item_id,
          serving_size: originalLog.serving_size,
          serving_unit: originalLog.serving_unit || 'g',
          user_serving_size: originalLog.user_serving_size || null,
          user_serving_unit: originalLog.user_serving_unit || null,
          total_carbs_g: originalLog.total_carbs_g || null,
          total_calories: originalLog.total_calories || null,
          total_protein_g: originalLog.total_protein_g || null,
          total_fat_g: originalLog.total_fat_g || null,
          meal_type: 'snack', // Default to snack, user can edit if needed
          logged_at: new Date().toISOString(),
        } as any); // Type assertion to bypass TypeScript issues

      if (error) throw error;
      loadLogs();
    } catch (error) {
      console.error('Error logging food again:', error);
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
            // Group logs by meal type
            const groupedLogs = logs.reduce((acc: any, log: any) => {
              const mealType = log.meal_type;
              if (!acc[mealType]) {
                acc[mealType] = [];
              }
              acc[mealType].push(log);
              return acc;
            }, {});

            // Define meal order
            const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
            
            return mealOrder.map(mealType => {
              const mealLogs = groupedLogs[mealType];
              if (!mealLogs || mealLogs.length === 0) return null;

              // Calculate meal totals
              const mealTotals = mealLogs.reduce((acc: any, log: any) => ({
                calories: acc.calories + (Number(log.total_calories) || 0),
                carbs: acc.carbs + (Number(log.total_carbs_g) || 0),
                protein: acc.protein + (Number(log.total_protein_g) || 0),
                fat: acc.fat + (Number(log.total_fat_g) || 0),
              }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

              // Get CGM readings from the first log (they should be similar for the same meal time)
              const firstLog = mealLogs[0];
              const hasCGM = firstLog.cgm_1hr_post_meal || firstLog.cgm_2hr_post_meal;

              return (
                <div key={mealType} className="bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 overflow-hidden">
                  {/* Meal Header */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 border-b border-slate-600">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </h3>
                      <div className="flex gap-3 text-sm flex-wrap items-center">
                        <span className="px-2 py-1 bg-blue-900/40 text-blue-300 font-semibold rounded">
                          {mealTotals.carbs.toFixed(1)}g carbs
                        </span>
                        <span className="text-slate-400">
                          {mealTotals.calories.toFixed(0)} cal
                        </span>
                        {hasCGM && (
                          <>
                            <span className="text-slate-500">•</span>
                            <div className="flex items-center gap-3">
                              {firstLog.cgm_1hr_post_meal && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 text-xs">1hr:</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    firstLog.cgm_1hr_post_meal < 70 ? 'bg-red-900/30 text-red-400' :
                                    firstLog.cgm_1hr_post_meal > 180 ? 'bg-orange-900/30 text-orange-400' :
                                    'bg-green-900/30 text-green-400'
                                  }`}>
                                    {firstLog.cgm_1hr_post_meal}
                                  </span>
                                </div>
                              )}
                              {firstLog.cgm_2hr_post_meal && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 text-xs">2hr:</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    firstLog.cgm_2hr_post_meal < 70 ? 'bg-red-900/30 text-red-400' :
                                    firstLog.cgm_2hr_post_meal > 180 ? 'bg-orange-900/30 text-orange-400' :
                                    'bg-green-900/30 text-green-400'
                                  }`}>
                                    {firstLog.cgm_2hr_post_meal}
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
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
                {log.image_url && (
                  <img
                    src={log.image_url}
                    alt={log.product_name || log.custom_food_name}
                    className="w-16 h-16 object-cover rounded border border-slate-600"
                  />
                )}
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
                  <div className="flex gap-3 mt-2 text-sm flex-wrap">
                    {/* Carbs - Most Prominent */}
                    <span className="px-3 py-1 bg-blue-900/40 text-blue-300 font-semibold rounded-full">
                      {Number(log.total_carbs_g).toFixed(1)}g carbs
                    </span>
                    <span className="text-slate-400">
                      {Number(log.total_calories).toFixed(0)} cal
                    </span>
                    {log.total_protein_g && (
                      <span className="text-slate-400">
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
