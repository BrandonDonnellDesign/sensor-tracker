'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface FoodLogEditFormProps {
  log: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export function FoodLogEditForm({ log, onCancel, onSuccess }: FoodLogEditFormProps) {
  const [servingSize, setServingSize] = useState(log.user_serving_size || log.serving_size);
  const [servingUnit, setServingUnit] = useState(log.user_serving_unit || 'g');
  const [mealType, setMealType] = useState(log.meal_type);
  const [notes, setNotes] = useState(log.notes || '');
  const [loggedTime, setLoggedTime] = useState(new Date(log.logged_at).toTimeString().slice(0, 5));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get food nutrition per 100g
  const foodItem = log.food_items;
  const nutritionPer100g = {
    calories: foodItem?.energy_kcal || 0,
    carbs: foodItem?.carbohydrates_g || 0,
    protein: foodItem?.proteins_g || 0,
    fat: foodItem?.fat_g || 0,
  };

  // Convert serving to grams for calculation
  const getServingInGrams = () => {
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
        // Calculate grams per serving from the original log
        // If originally logged as "1 serving = 100g", then gramsPerServing = 100
        const originalUserServing = log.user_serving_size || 1;
        const originalGrams = log.serving_size || 100;
        const gramsPerServing = originalGrams / originalUserServing;
        return servingSize * gramsPerServing;
      case 'g':
      default:
        return servingSize;
    }
  };

  const calculateNutrition = (valuePer100g: number) => {
    const gramsServing = getServingInGrams();
    return ((valuePer100g * gramsServing) / 100).toFixed(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const gramsServing = getServingInGrams();
      
      // Create timestamp with timezone offset
      const logDate = new Date(log.logged_at);
      const [hours, minutes] = loggedTime.split(':');
      const loggedAt = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), parseInt(hours), parseInt(minutes));
      
      // Format with timezone offset (e.g., 2025-01-27T14:30:00-08:00)
      const year = loggedAt.getFullYear();
      const month = String(loggedAt.getMonth() + 1).padStart(2, '0');
      const day = String(loggedAt.getDate()).padStart(2, '0');
      const hour = String(loggedAt.getHours()).padStart(2, '0');
      const minute = String(loggedAt.getMinutes()).padStart(2, '0');
      const tzOffset = -loggedAt.getTimezoneOffset();
      const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
      const tzMinutes = String(Math.abs(tzOffset) % 60).padStart(2, '0');
      const tzSign = tzOffset >= 0 ? '+' : '-';
      const loggedAtString = `${year}-${month}-${day}T${hour}:${minute}:00${tzSign}${tzHours}:${tzMinutes}`;
      
      const { error } = await supabase
        .from('food_logs')
        .update({
          serving_size: gramsServing,
          serving_unit: 'g',
          user_serving_size: servingSize,
          user_serving_unit: servingUnit,
          total_carbs_g: parseFloat(calculateNutrition(nutritionPer100g.carbs)),
          total_calories: parseFloat(calculateNutrition(nutritionPer100g.calories)),
          total_protein_g: parseFloat(calculateNutrition(nutritionPer100g.protein)),
          total_fat_g: parseFloat(calculateNutrition(nutritionPer100g.fat)),
          meal_type: mealType,
          notes: notes || null,
          logged_at: loggedAtString,
        })
        .eq('id', log.id);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error updating food log:', error);
      alert('Failed to update food log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
        Edit Food Log
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Food Info */}
        <div className="flex items-start gap-4">
          {foodItem?.image_url && (
            <img
              src={foodItem.image_url}
              alt={foodItem.product_name}
              className="w-24 h-24 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {log.custom_food_name || foodItem?.product_name}
            </h4>
            {foodItem?.brand && (
              <p className="text-gray-600 dark:text-slate-400">{foodItem.brand}</p>
            )}
          </div>
        </div>

        {/* Serving Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Serving Size
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={servingSize}
              onChange={(e) => setServingSize(Number(e.target.value))}
              min="0.1"
              step="0.1"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
            <select
              value={servingUnit}
              onChange={(e) => setServingUnit(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            >
              <option value="g">grams (g)</option>
              <option value="oz">ounces (oz)</option>
              <option value="lb">pounds (lb)</option>
              <option value="cup">cups</option>
              <option value="tbsp">tablespoons</option>
              <option value="tsp">teaspoons</option>
              <option value="serving">servings</option>
            </select>
          </div>
          {servingUnit !== 'g' && (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              ≈ {getServingInGrams().toFixed(1)}g
            </p>
          )}
        </div>

        {/* Nutrition Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Calories</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {calculateNutrition(nutritionPer100g.calories)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Carbs</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {calculateNutrition(nutritionPer100g.carbs)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Protein</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {calculateNutrition(nutritionPer100g.protein)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-slate-400">Fat</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {calculateNutrition(nutritionPer100g.fat)}g
            </p>
          </div>
        </div>

        {/* Meal Type and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Time
            </label>
            <input
              type="time"
              value={loggedTime}
              onChange={(e) => setLoggedTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
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
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Food Log'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
