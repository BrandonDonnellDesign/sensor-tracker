'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2, Plus } from 'lucide-react';

interface CustomFoodFormProps {
  onCancel: () => void;
  onSuccess: (food: any) => void;
}

export function CustomFoodForm({ onCancel, onSuccess }: CustomFoodFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    servingSize: 100,
    servingUnit: 'g',
    calories: '',
    carbs: '',
    protein: '',
    fat: '',
    fiber: '',
    sugar: '',
    sodium: '',
    isPublic: false,
  });

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      // Use the API endpoint instead of direct database access
      const response = await fetch('/api/food/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: formData.name.trim(),
          brand: formData.brand.trim() || null,
          serving_size: formData.servingSize,
          serving_unit: formData.servingUnit,
          energy_kcal: formData.calories ? parseFloat(formData.calories) : null,
          carbohydrates_g: formData.carbs ? parseFloat(formData.carbs) : null,
          proteins_g: formData.protein ? parseFloat(formData.protein) : null,
          fat_g: formData.fat ? parseFloat(formData.fat) : null,
          fiber_g: formData.fiber ? parseFloat(formData.fiber) : null,
          sugars_g: formData.sugar ? parseFloat(formData.sugar) : null,
          sodium_mg: formData.sodium ? parseFloat(formData.sodium) : null,
          is_public: formData.isPublic
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const { item: foodItem } = await response.json();

      // Convert to the format expected by FoodLogForm
      const customFood = {
        id: foodItem.id,
        name: foodItem.product_name,
        brand: foodItem.brand,
        calories: foodItem.energy_kcal || 0,
        carbs: foodItem.carbohydrates_g || 0,
        protein: foodItem.proteins_g || 0,
        fat: foodItem.fat_g || 0,
        fiber: foodItem.fiber_g,
        sugar: foodItem.sugars_g,
        sodium: foodItem.sodium_mg,
        servingSize: foodItem.serving_size,
        servingUnit: foodItem.serving_unit,
        isCustom: true,
      };

      onSuccess(customFood);
    } catch (error) {
      console.error('Error creating custom food:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create custom food. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5" />
        Create Custom Food
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Food Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Homemade Pasta Salad"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Brand (optional)
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              placeholder="e.g., Homemade"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
        </div>

        {/* Serving Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Serving Size
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.servingSize}
              onChange={(e) => handleInputChange('servingSize', Number(e.target.value))}
              min="0.1"
              step="0.1"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
            <select
              value={formData.servingUnit}
              onChange={(e) => handleInputChange('servingUnit', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
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
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Nutrition values will be calculated per {formData.servingSize} {formData.servingUnit}
          </p>
        </div>

        {/* Nutrition Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
            Nutrition Information (per serving)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                Calories
              </label>
              <input
                type="number"
                value={formData.calories}
                onChange={(e) => handleInputChange('calories', e.target.value)}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                value={formData.carbs}
                onChange={(e) => handleInputChange('carbs', e.target.value)}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                value={formData.protein}
                onChange={(e) => handleInputChange('protein', e.target.value)}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                value={formData.fat}
                onChange={(e) => handleInputChange('fat', e.target.value)}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Optional Nutrition */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
            Additional Nutrition (optional)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                Fiber (g)
              </label>
              <input
                type="number"
                value={formData.fiber}
                onChange={(e) => handleInputChange('fiber', e.target.value)}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                Sugar (g)
              </label>
              <input
                type="number"
                value={formData.sugar}
                onChange={(e) => handleInputChange('sugar', e.target.value)}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                Sodium (mg)
              </label>
              <input
                type="number"
                value={formData.sodium}
                onChange={(e) => handleInputChange('sodium', e.target.value)}
                min="0"
                step="0.1"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Sharing Options */}
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="makePublic"
              checked={formData.isPublic}
              onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="makePublic" className="text-sm text-gray-700 dark:text-slate-300">
              Share this food with other users (make it public)
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Public foods can be found and used by other users in their food logs
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create & Log Food'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}