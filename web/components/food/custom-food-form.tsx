'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2, Plus, Camera, X, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';

interface CustomFoodFormProps {
  onCancel: () => void;
  onSuccess: (food: any) => void;
  editingFood?: any; // Food item to edit (if editing)
}

export function CustomFoodForm({ onCancel, onSuccess, editingFood }: CustomFoodFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editingFood?.image_url || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: editingFood?.product_name || '',
    brand: editingFood?.brand || '',
    servingSize: editingFood?.serving_size || 100,
    servingUnit: editingFood?.serving_unit || 'g',
    calories: editingFood?.energy_kcal?.toString() || '',
    carbs: editingFood?.carbohydrates_g?.toString() || '',
    protein: editingFood?.proteins_g?.toString() || '',
    fat: editingFood?.fat_g?.toString() || '',
    fiber: editingFood?.fiber_g?.toString() || '',
    sugar: editingFood?.sugars_g?.toString() || '',
    sodium: editingFood?.sodium_mg?.toString() || '',
    isPublic: editingFood?.is_public || false,
  });

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || !user) return null;

    setIsUploadingImage(true);
    try {
      const supabase = createClient();
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('food-images')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      logger.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      // Upload image first if selected
      let imageUrl = imagePreview; // Keep existing image if not changed
      if (selectedImage) {
        imageUrl = await uploadImage();
      }

      const payload = {
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
        is_public: formData.isPublic,
        image_url: imageUrl
      };

      // Use the API endpoint - POST for create, PUT for update
      const url = editingFood ? `/api/food/items/${editingFood.id}` : '/api/food/items';
      const method = editingFood ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      logger.error('Error creating custom food:', error);
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
        {editingFood ? 'Edit Custom Food' : 'Create Custom Food'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Food Photo (optional)
          </label>
          <div className="flex items-start gap-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-slate-600"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-slate-700">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="food-image-upload"
              />
              <label
                htmlFor="food-image-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4" />
                {imagePreview ? 'Change Photo' : 'Add Photo'}
              </label>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Upload a photo of your food (max 5MB)
              </p>
            </div>
          </div>
        </div>

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
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
            />
            <select
              value={formData.servingUnit}
              onChange={(e) => handleInputChange('servingUnit', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
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
            disabled={isSubmitting || isUploadingImage || !formData.name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {isSubmitting || isUploadingImage ? (
              <>
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                {isUploadingImage ? 'Uploading Photo...' : 'Creating...'}
              </>
            ) : (
              editingFood ? 'Update Food' : 'Create & Log Food'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}