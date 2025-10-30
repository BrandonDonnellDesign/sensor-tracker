'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus } from 'lucide-react';

interface FoodLogFormProps {
  food: any;
  onCancel: () => void;
  onSuccess: () => void;
  onAddToMeal?: (food: any) => void;
}

export function FoodLogForm({ food, onCancel, onSuccess, onAddToMeal }: FoodLogFormProps) {
  const { user } = useAuth();
  const [servingSize, setServingSize] = useState(100);
  const [servingUnit, setServingUnit] = useState('g');
  const [mealType, setMealType] = useState<string>('snack');
  const [notes, setNotes] = useState('');
  const [loggedTime, setLoggedTime] = useState(new Date().toTimeString().slice(0, 5));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert serving to grams for calculation
  const getServingInGrams = () => {
    switch (servingUnit) {
      case 'oz':
        return servingSize * 28.35; // 1 oz = 28.35g
      case 'lb':
        return servingSize * 453.592; // 1 lb = 453.592g
      case 'cup':
        return servingSize * 240; // 1 cup ≈ 240g (varies by food)
      case 'tbsp':
        return servingSize * 15; // 1 tbsp ≈ 15g
      case 'tsp':
        return servingSize * 5; // 1 tsp ≈ 5g
      case 'serving':
        // Use product's serving size, parse as number if it's a string
        let productServingSize = typeof food.servingSize === 'string' 
          ? parseFloat(food.servingSize) 
          : (food.servingSize || 100);
        
        // Fallback: if serving size is suspiciously small (like 1g), use 100g
        // This handles bad cached data where serving_size was stored incorrectly
        if (productServingSize < 10) {
          console.warn('Suspicious serving size detected:', productServingSize, 'using 100g instead');
          productServingSize = 100;
        }
        
        return servingSize * productServingSize;
      case 'g':
      default:
        return servingSize;
    }
  };

  const calculateNutrition = (value: number | null | undefined) => {
    if (!value) return null;
    const gramsServing = getServingInGrams();
    return ((value * gramsServing) / 100).toFixed(1);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // First, check if food item exists in database by barcode
      let foodItemId = null;
      
      if (food.barcode) {
        const { data: existingFood } = await supabase
          .from('food_items')
          .select('id')
          .eq('barcode', food.barcode)
          .maybeSingle();

        if (existingFood) {
          foodItemId = existingFood.id;
        }
      }

      // If not found by barcode, check if it's already a database record with UUID
      if (!foodItemId && food.id && food.id.length === 36) {
        // Looks like a UUID (36 chars with dashes)
        foodItemId = food.id;
      }

      // If still not found, create new food item
      if (!foodItemId) {
        const { data: newFood, error: insertError } = await supabase
          .from('food_items')
          .insert([{
            barcode: food.barcode,
            product_name: food.name || food.product_name,
            brand: food.brand,
            categories: food.categories,
            image_url: food.imageUrl || food.image_url,
            serving_size: food.servingSize || food.serving_size,
            serving_unit: food.servingUnit || food.serving_unit,
            energy_kcal: food.calories || food.energy_kcal,
            carbohydrates_g: food.carbs || food.carbohydrates_g,
            sugars_g: food.sugar || food.sugars_g,
            fiber_g: food.fiber || food.fiber_g,
            proteins_g: food.protein || food.proteins_g,
            fat_g: food.fat || food.fat_g,
            saturated_fat_g: food.saturated_fat_g,
            sodium_mg: food.sodium || food.sodium_mg,
            off_id: food.barcode || food.id || food.off_id,
            off_last_updated: food.off_last_updated,
            data_quality_score: food.data_quality_score,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        foodItemId = newFood.id;
      }

      // Create food log
      const gramsServing = getServingInGrams();
      const totalCarbs = calculateNutrition(food.carbs || food.carbohydrates_g);
      const totalCalories = calculateNutrition(food.calories || food.energy_kcal);
      const totalProtein = calculateNutrition(food.protein || food.proteins_g);
      const totalFat = calculateNutrition(food.fat || food.fat_g);

      // Create timestamp with timezone offset
      const now = new Date();
      const [hours, minutes] = loggedTime.split(':');
      const loggedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes));
      
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

      const { error: logError } = await supabase
        .from('food_logs')
        .insert([{
          user_id: user.id,
          food_item_id: foodItemId,
          serving_size: gramsServing,
          serving_unit: 'g',
          user_serving_size: servingSize,
          user_serving_unit: servingUnit,
          total_carbs_g: totalCarbs ? parseFloat(totalCarbs) : null,
          total_calories: totalCalories ? parseFloat(totalCalories) : null,
          total_protein_g: totalProtein ? parseFloat(totalProtein) : null,
          total_fat_g: totalFat ? parseFloat(totalFat) : null,
          meal_type: mealType,
          notes: notes || null,
          logged_at: loggedAtString,
        }]);

      if (logError) throw logError;

      onSuccess();
    } catch (error) {
      console.error('Error logging food:', error);
      alert('Failed to log food. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Food Info */}
      <div className="flex items-start gap-4">
        {(food.imageUrl || food.image_url) && (
          <img
            src={food.imageUrl || food.image_url}
            alt={food.name || food.product_name}
            className="w-24 h-24 object-cover rounded-lg"
          />
        )}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {food.name || food.product_name}
          </h3>
          {food.brand && (
            <p className="text-gray-600 dark:text-slate-400">{food.brand}</p>
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
            {calculateNutrition(food.calories || food.energy_kcal) || '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-slate-400">Carbs</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {calculateNutrition(food.carbs || food.carbohydrates_g) || '-'}g
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-slate-400">Protein</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {calculateNutrition(food.protein || food.proteins_g) || '-'}g
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-slate-400">Fat</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {calculateNutrition(food.fat || food.fat_g) || '-'}g
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
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        {onAddToMeal && (
          <button
            type="button"
            onClick={() => onAddToMeal({ 
              ...food, 
              servingSize, 
              servingUnit,
              mealType,
              notes 
            })}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add to Meal
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Logging...
            </>
          ) : (
            'Log Food'
          )}
        </button>
      </div>
    </form>
  );
}
