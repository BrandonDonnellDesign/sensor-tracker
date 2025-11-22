'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';
import { FavoriteButton } from './favorite-button';

interface FoodLogEditFormProps {
  log: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export function FoodLogEditForm({ log, onCancel, onSuccess }: FoodLogEditFormProps) {
  // Smart defaults based on food type (same logic as new food form)
  const getSmartDefaults = () => {
    const foodName = (log.product_name || log.custom_food_name || '').toLowerCase();
    const brand = (log.brand || '').toLowerCase();
    
    // Energy drinks and similar beverages default to servings
    const energyDrinkKeywords = ['energy drink', 'energy', 'monster', 'red bull', 'rockstar', 'bang', 'reign', 'celsius', 'ghost', 'prime energy', 'gfuel', 'g fuel'];
    const isEnergyDrink = energyDrinkKeywords.some(keyword => foodName.includes(keyword) || brand.includes(keyword));
    
    // Fast food chains and restaurant items default to servings
    const fastFoodBrands = ['mcdonald', 'burger king', 'kfc', 'taco bell', 'subway', 'pizza hut', 'domino', 'wendy', 'chick-fil-a', 'chipotle', 'starbucks'];
    const isFastFood = fastFoodBrands.some(brand_name => brand.includes(brand_name) || foodName.includes(brand_name));
    
    // Items that are typically measured in servings
    const servingKeywords = ['large', 'medium', 'small', 'cup', 'bottle', 'can', 'piece', 'slice', 'sandwich', 'burger', 'fries'];
    const isServingItem = servingKeywords.some(keyword => foodName.includes(keyword));
    
    return { shouldUseServings: isEnergyDrink || isFastFood || isServingItem };
  };
  
  const smartDefaults = getSmartDefaults();
  
  // Use existing values, but convert to servings if it's a fast food item and currently in grams
  const getInitialServingValues = () => {
    // If user_serving_size exists, use that with its unit
    if (log.user_serving_size && log.user_serving_unit) {
      return { size: log.user_serving_size, unit: log.user_serving_unit };
    }
    
    // Otherwise use the stored serving_size (which is in grams)
    const currentSize = log.serving_size || 100;
    const currentUnit = 'g';
    
    // If it's a fast food item but currently stored in grams, convert to servings for better UX
    if (smartDefaults.shouldUseServings && currentUnit === 'g') {
      const foodServingSize = parseFloat(log.food_serving_size) || 100;
      const servings = currentSize / foodServingSize;
      return { size: Math.round(servings * 10) / 10, unit: 'serving' }; // Round to 1 decimal
    }
    
    return { size: currentSize, unit: currentUnit };
  };
  
  const initialValues = getInitialServingValues();
  const [servingSize, setServingSize] = useState(initialValues.size);
  const [servingUnit, setServingUnit] = useState(initialValues.unit);
  const [mealType, setMealType] = useState(log.meal_type);
  const [notes, setNotes] = useState(log.notes || '');
  const [loggedTime, setLoggedTime] = useState(new Date(log.logged_at).toTimeString().slice(0, 5));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get food nutrition per 100g from the log (which includes food item data from the view)
  const nutritionPer100g = {
    calories: parseFloat(log.energy_kcal) || parseFloat(log.calories_per_100g) || 0,
    carbs: parseFloat(log.carbohydrates_g) || parseFloat(log.carbs_per_100g) || 0,
    protein: parseFloat(log.proteins_g) || parseFloat(log.protein_per_100g) || 0,
    fat: parseFloat(log.fat_g) || parseFloat(log.fat_per_100g) || 0,
  };

  // Convert serving to grams for calculation
  const getServingInGrams = () => {
    const size = parseFloat(String(servingSize)) || 0;
    if (size <= 0) return 0;
    
    switch (servingUnit) {
      case 'oz':
        return size * 28.35;
      case 'lb':
        return size * 453.592;
      case 'cup':
        return size * 240;
      case 'tbsp':
        return size * 15;
      case 'tsp':
        return size * 5;
      case 'serving':
        // If we have the original serving_size in grams and user_serving_size, calculate the per-serving grams
        if (log.user_serving_size && log.serving_size) {
          // The original serving_size is in grams, user_serving_size is the number of servings
          // So grams per serving = total grams / number of servings
          const gramsPerServing = parseFloat(log.serving_size) / parseFloat(log.user_serving_size);
          return size * gramsPerServing;
        }
        
        // Otherwise try to get the food item's defined serving size
        let foodServingSize = parseFloat(log.food_serving_size) || 
                             parseFloat(log.food_item_serving_size) ||
                             parseFloat(log.item_serving_size) ||
                             100;
        
        // If the serving size seems too small (less than 10g), it's probably wrong - use a reasonable default
        if (foodServingSize < 10) {
          // For sandwiches and meals, use a larger default
          const foodName = (log.product_name || log.custom_food_name || '').toLowerCase();
          if (foodName.includes('sandwich') || foodName.includes('burger') || foodName.includes('meal')) {
            foodServingSize = 200; // 200g default for meals
          } else {
            foodServingSize = 100; // 100g default for other items
          }
        }
        
        return size * foodServingSize;
      case 'g':
      default:
        return size;
    }
  };

  const calculateNutrition = (valuePer100g: number | string) => {
    const numValue = typeof valuePer100g === 'string' ? parseFloat(valuePer100g) : valuePer100g;
    if (isNaN(numValue) || numValue === 0) return '0';
    const gramsServing = getServingInGrams();
    if (gramsServing === 0) return '0';
    return ((numValue * gramsServing) / 100).toFixed(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createClient();
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
      logger.error('Error updating food log:', error);
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
          {log.image_url && (
            <img
              src={log.image_url}
              alt={log.product_name}
              className="w-24 h-24 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  {log.custom_food_name || log.product_name}
                </h4>
                {log.brand && (
                  <p className="text-gray-600 dark:text-slate-400">{log.brand}</p>
                )}
              </div>
              <FavoriteButton
                foodId={log.food_item_id}
                foodName={log.custom_food_name || log.product_name}
                defaultServingSize={servingSize}
                defaultServingUnit={servingUnit}
              />
            </div>
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
              {(() => {
                const foodName = (log.product_name || log.custom_food_name || '').toLowerCase();
                const brand = (log.brand || '').toLowerCase();
                
                // Energy drinks and similar beverages default to servings
                const energyDrinkKeywords = ['energy drink', 'energy', 'monster', 'red bull', 'rockstar', 'bang', 'reign', 'celsius', 'ghost', 'prime energy', 'gfuel', 'g fuel'];
                const isEnergyDrink = energyDrinkKeywords.some(keyword => foodName.includes(keyword) || brand.includes(keyword));
                
                const fastFoodBrands = ['mcdonald', 'burger king', 'kfc', 'taco bell', 'subway', 'pizza hut', 'domino', 'wendy', 'chick-fil-a', 'chipotle', 'starbucks'];
                const isFastFood = fastFoodBrands.some(brand_name => brand.includes(brand_name) || foodName.includes(brand_name));
                
                if (isEnergyDrink || isFastFood) {
                  return (
                    <>
                      <option value="serving">servings</option>
                      <option value="g">grams (g)</option>
                      <option value="oz">ounces (oz)</option>
                      <option value="lb">pounds (lb)</option>
                      <option value="cup">cups</option>
                      <option value="tbsp">tablespoons</option>
                      <option value="tsp">teaspoons</option>
                    </>
                  );
                } else {
                  return (
                    <>
                      <option value="g">grams (g)</option>
                      <option value="oz">ounces (oz)</option>
                      <option value="lb">pounds (lb)</option>
                      <option value="cup">cups</option>
                      <option value="tbsp">tablespoons</option>
                      <option value="tsp">teaspoons</option>
                      <option value="serving">servings</option>
                    </>
                  );
                }
              })()}
            </select>
          </div>
          {servingUnit !== 'g' && (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              ≈ {getServingInGrams().toFixed(1)}g
              {servingUnit === 'serving' && (log.product_name || log.custom_food_name) && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  (1 serving = {(log.product_name || log.custom_food_name).toLowerCase().includes('large') ? 'Large' : 
                              (log.product_name || log.custom_food_name).toLowerCase().includes('medium') ? 'Medium' :
                              (log.product_name || log.custom_food_name).toLowerCase().includes('small') ? 'Small' : 'Standard'} size)
                </span>
              )}
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
