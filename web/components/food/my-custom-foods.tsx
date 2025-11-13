'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { Edit, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { CustomFoodForm } from './custom-food-form';

interface MyCustomFoodsProps {
  onAddToMeal?: (food: any) => void;
}

export function MyCustomFoods({ onAddToMeal }: MyCustomFoodsProps = {}) {
  const { user } = useAuth();
  const [customFoods, setCustomFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFood, setEditingFood] = useState<any | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (user) {
      loadCustomFoods();
    }
  }, [user]);

  const loadCustomFoods = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('created_by_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomFoods(data || []);
    } catch (error) {
      console.error('Error loading custom foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (food: any) => {
    setEditingFood(food);
    setShowEditForm(true);
  };

  const handleDelete = async (foodId: string) => {
    if (!confirm('Are you sure you want to delete this custom food?')) {
      return;
    }

    try {
      const response = await fetch(`/api/food/items/${foodId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete food');
      }

      await loadCustomFoods();
    } catch (error) {
      console.error('Error deleting food:', error);
      alert('Failed to delete food. Please try again.');
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setEditingFood(null);
    loadCustomFoods();
  };

  if (showEditForm && editingFood) {
    return (
      <CustomFoodForm
        editingFood={editingFood}
        onCancel={() => {
          setShowEditForm(false);
          setEditingFood(null);
        }}
        onSuccess={handleEditSuccess}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (customFoods.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-slate-400">
        <p>You haven't created any custom foods yet.</p>
        <p className="text-sm mt-2">Create one using the "Custom Food" tab!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
        My Custom Foods ({customFoods.length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customFoods.map((food) => (
          <div
            key={food.id}
            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              {food.image_url ? (
                <img
                  src={food.image_url}
                  alt={food.product_name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-slate-100 truncate">
                  {food.product_name}
                </h4>
                {food.brand && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                    {food.brand}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-slate-400">
                  <span>{food.energy_kcal || 0} cal</span>
                  <span>{food.carbohydrates_g || 0}g carbs</span>
                  <span>{food.serving_size}{food.serving_unit}</span>
                </div>
                {food.is_public && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                    Public
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleEdit(food)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(food.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {onAddToMeal && (
              <button
                onClick={() => onAddToMeal({
                  id: food.id,
                  name: food.product_name,
                  brand: food.brand,
                  calories: food.energy_kcal || 0,
                  carbs: food.carbohydrates_g || 0,
                  protein: food.proteins_g || 0,
                  fat: food.fat_g || 0,
                  fiber: food.fiber_g,
                  sugar: food.sugars_g,
                  sodium: food.sodium_mg,
                  servingSize: food.serving_size,
                  servingUnit: food.serving_unit,
                  imageUrl: food.image_url,
                  isCustom: true
                })}
                className="w-full mt-3 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
              >
                + Add to Meal
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
