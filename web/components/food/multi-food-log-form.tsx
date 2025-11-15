'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';
import { Loader2, Trash2, Plus } from 'lucide-react';

interface MultiFoodLogFormProps {
  items: any[];
  onCancel: () => void;
  onSuccess: () => void;
  onAddMore: () => void;
}

export function MultiFoodLogForm({ items, onCancel, onSuccess, onAddMore }: MultiFoodLogFormProps) {
  const { user } = useAuth();
  const [mealType, setMealType] = useState<string>('snack');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mealItems, setMealItems] = useState(items);

  const getTotalNutrition = () => {
    return mealItems.reduce((acc, item) => {
      const gramsServing = getServingInGrams(item.servingSize, item.servingUnit, item);
      const calories = ((item.calories || item.energy_kcal || 0) * gramsServing) / 100;
      const carbs = ((item.carbs || item.carbohydrates_g || 0) * gramsServing) / 100;
      const protein = ((item.protein || item.proteins_g || 0) * gramsServing) / 100;
      const fat = ((item.fat || item.fat_g || 0) * gramsServing) / 100;

      return {
        calories: acc.calories + calories,
        carbs: acc.carbs + carbs,
        protein: acc.protein + protein,
        fat: acc.fat + fat,
      };
    }, { calories: 0, carbs: 0, protein: 0, fat: 0 });
  };

  const getServingInGrams = (servingSize: number, servingUnit: string, food: any) => {
    switch (servingUnit) {
      case 'oz':
        return servingSize * 28.35;
      case 'lb':
        return servingSize * 453.592;
      case 'cup':
        return servingSize * 240;
      case 'tbsp':
        return servingSize * 15;
      case 'tsp':
        return servingSize * 5;
      case 'serving':
        return servingSize * (food.servingSize || 100);
      case 'g':
      default:
        return servingSize;
    }
  };

  const handleRemoveItem = (index: number) => {
    setMealItems(mealItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || mealItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      // Log each item
      for (const item of mealItems) {
        let foodItemId = null;

        // Check if food item exists in database
        if (item.barcode) {
          const { data: existingFood } = await supabase
            .from('food_items')
            .select('id')
            .eq('barcode', item.barcode)
            .maybeSingle();

          if (existingFood) {
            foodItemId = existingFood.id;
          }
        }

        if (!foodItemId && item.id && item.id.length === 36) {
          foodItemId = item.id;
        }

        // Create food item if needed
        if (!foodItemId) {
          const { data: newFood, error: insertError } = await supabase
            .from('food_items')
            .insert([{
              barcode: item.barcode,
              product_name: item.name || item.product_name,
              brand: item.brand,
              categories: item.categories,
              image_url: item.imageUrl || item.image_url,
              serving_size: item.servingSize || item.serving_size,
              serving_unit: item.servingUnit || item.serving_unit,
              energy_kcal: item.calories || item.energy_kcal,
              carbohydrates_g: item.carbs || item.carbohydrates_g,
              sugars_g: item.sugar || item.sugars_g,
              fiber_g: item.fiber || item.fiber_g,
              proteins_g: item.protein || item.proteins_g,
              fat_g: item.fat || item.fat_g,
              saturated_fat_g: item.saturated_fat_g,
              sodium_mg: item.sodium || item.sodium_mg,
              off_id: item.barcode || item.id || item.off_id,
            }])
            .select()
            .single();

          if (insertError) throw insertError;
          foodItemId = newFood.id;
        }

        // Create food log
        const gramsServing = getServingInGrams(item.servingSize, item.servingUnit, item);
        const calculateNutrition = (value: number | null | undefined) => {
          if (!value) return null;
          return ((value * gramsServing) / 100).toFixed(1);
        };

        const totalCarbs = calculateNutrition(item.carbs || item.carbohydrates_g);
        const totalCalories = calculateNutrition(item.calories || item.energy_kcal);
        const totalProtein = calculateNutrition(item.protein || item.proteins_g);
        const totalFat = calculateNutrition(item.fat || item.fat_g);

        const { error: logError } = await supabase
          .from('food_logs')
          .insert([{
            user_id: user.id,
            food_item_id: foodItemId,
            serving_size: gramsServing,
            serving_unit: 'g',
            user_serving_size: item.servingSize,
            user_serving_unit: item.servingUnit,
            total_carbs_g: totalCarbs ? parseFloat(totalCarbs) : null,
            total_calories: totalCalories ? parseFloat(totalCalories) : null,
            total_protein_g: totalProtein ? parseFloat(totalProtein) : null,
            total_fat_g: totalFat ? parseFloat(totalFat) : null,
            meal_type: mealType,
            notes: notes || null,
            logged_at: (() => {
              // Create timestamp with timezone offset like single food log form
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              const hour = String(now.getHours()).padStart(2, '0');
              const minute = String(now.getMinutes()).padStart(2, '0');
              const tzOffset = -now.getTimezoneOffset();
              const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
              const tzMinutes = String(Math.abs(tzOffset) % 60).padStart(2, '0');
              const tzSign = tzOffset >= 0 ? '+' : '-';
              return `${year}-${month}-${day}T${hour}:${minute}:00${tzSign}${tzHours}:${tzMinutes}`;
            })(),
          }]);

        if (logError) throw logError;
      }

      onSuccess();
    } catch (error) {
      logger.error('Error logging meal:', error);
      alert('Failed to log meal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = getTotalNutrition();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Log Meal ({mealItems.length} items)
        </h3>
      </div>

      {/* Meal Items */}
      <div className="space-y-3">
        {mealItems.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
          >
            {(item.imageUrl || item.image_url) && (
              <img
                src={item.imageUrl || item.image_url}
                alt={item.name || item.product_name}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-slate-100">
                {item.name || item.product_name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {item.servingSize} {item.servingUnit}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveItem(index)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add More Button */}
      <button
        type="button"
        onClick={onAddMore}
        className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400"
      >
        <Plus className="w-4 h-4 inline mr-2" />
        Add More Items
      </button>

      {/* Total Nutrition */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
          Total Nutrition
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400">Carbs</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {totals.carbs.toFixed(1)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Calories</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {totals.calories.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Protein</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {totals.protein.toFixed(1)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Fat</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {totals.fat.toFixed(1)}g
            </p>
          </div>
        </div>
      </div>

      {/* Meal Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Meal Type
        </label>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors resize-none"
          placeholder="Add any notes about this meal..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || mealItems.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Logging Meal...
            </>
          ) : (
            `Log ${mealItems.length} Item${mealItems.length > 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </form>
  );
}
