'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2, Camera, X, Image as ImageIcon, Upload, ExternalLink, Barcode, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';

interface BarcodeManualEntryProps {
  barcode: string;
  onCancel: () => void;
  onSuccess: (food: any) => void;
}

export function BarcodeManualEntry({ barcode, onCancel, onSuccess }: BarcodeManualEntryProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingToOFF, setIsSubmittingToOFF] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [submitToOpenFoodFacts, setSubmitToOpenFoodFacts] = useState(true);
  const [offSubmissionResult, setOffSubmissionResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    isPublic: true, // Default to public for barcode entries
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
    if (!selectedImage || !user?.id) return null;

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

  const submitToOpenFoodFactsAPI = async (imageUrl: string | null) => {
    if (!submitToOpenFoodFacts) return { success: true, message: 'Skipped OpenFoodFacts submission' };

    setIsSubmittingToOFF(true);
    try {
      // Create the OpenFoodFacts submission payload
      const offPayload = {
        code: barcode,
        product_name: formData.name.trim(),
        brands: formData.brand.trim() || undefined,
        serving_size: `${formData.servingSize} ${formData.servingUnit}`,
        'nutriments.energy-kcal_100g': formData.calories ? (parseFloat(formData.calories) / formData.servingSize * 100).toString() : undefined,
        'nutriments.carbohydrates_100g': formData.carbs ? (parseFloat(formData.carbs) / formData.servingSize * 100).toString() : undefined,
        'nutriments.proteins_100g': formData.protein ? (parseFloat(formData.protein) / formData.servingSize * 100).toString() : undefined,
        'nutriments.fat_100g': formData.fat ? (parseFloat(formData.fat) / formData.servingSize * 100).toString() : undefined,
        'nutriments.fiber_100g': formData.fiber ? (parseFloat(formData.fiber) / formData.servingSize * 100).toString() : undefined,
        'nutriments.sugars_100g': formData.sugar ? (parseFloat(formData.sugar) / formData.servingSize * 100).toString() : undefined,
        'nutriments.sodium_100g': formData.sodium ? (parseFloat(formData.sodium) / 1000 / formData.servingSize * 100).toString() : undefined, // Convert mg to g
        user_id: `cgmtracker_${user?.id}`,
        comment: 'Added via CGM Tracker app',
      };

      // Remove undefined values
      const cleanPayload = Object.fromEntries(
        Object.entries(offPayload).filter(([_, value]) => value !== undefined)
      );

      // Submit to OpenFoodFacts via our API endpoint
      const response = await fetch('/api/food/submit-to-openfoodfacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode,
          productData: cleanPayload,
          imageUrl
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, message: result.message || 'Successfully submitted to OpenFoodFacts!' };
      } else {
        return { success: false, message: result.error || 'Failed to submit to OpenFoodFacts' };
      }
    } catch (error) {
      logger.error('Error submitting to OpenFoodFacts:', error);
      return { success: false, message: 'Error submitting to OpenFoodFacts. Product saved locally.' };
    } finally {
      setIsSubmittingToOFF(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      // Upload image first if selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage();
      }

      // Submit to OpenFoodFacts if requested
      const offResult = await submitToOpenFoodFactsAPI(imageUrl);
      setOffSubmissionResult(offResult);

      // Create the local food item
      const payload = {
        product_name: formData.name.trim(),
        brand: formData.brand.trim() || null,
        barcode: barcode, // Include the barcode
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
        image_url: imageUrl,
        data_source: 'user_barcode_entry' // Mark as user-created barcode entry
      };

      const response = await fetch('/api/food/items', {
        method: 'POST',
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
        barcode: foodItem.barcode,
        calories: foodItem.energy_kcal || 0,
        carbs: foodItem.carbohydrates_g || 0,
        protein: foodItem.proteins_g || 0,
        fat: foodItem.fat_g || 0,
        fiber: foodItem.fiber_g,
        sugar: foodItem.sugars_g,
        sodium: foodItem.sodium_mg,
        servingSize: foodItem.serving_size,
        servingUnit: foodItem.serving_unit,
        imageUrl: foodItem.image_url,
        isCustom: true,
      };

      onSuccess(customFood);
    } catch (error) {
      logger.error('Error creating barcode food entry:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create food entry. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Barcode className="w-5 h-5" />
          Add Product for Barcode {barcode}
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">Product not found in database</p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                Help improve the food database by adding this product's information. 
                Your entry will be saved locally and optionally submitted to OpenFoodFacts for others to use.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Product Photo (recommended)
          </label>
          <div className="flex items-start gap-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Product preview"
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
                id="product-image-upload"
              />
              <label
                htmlFor="product-image-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4" />
                {imagePreview ? 'Change Photo' : 'Add Photo'}
              </label>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                A photo helps others identify the product (max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Organic Whole Wheat Bread"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Brand
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              placeholder="e.g., Nature's Own"
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
              <option value="slice">slices</option>
              <option value="piece">pieces</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Nutrition values should be per {formData.servingSize} {formData.servingUnit}
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

        {/* OpenFoodFacts Submission */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="submitToOFF"
              checked={submitToOpenFoodFacts}
              onChange={(e) => setSubmitToOpenFoodFacts(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 mt-0.5"
            />
            <div className="flex-1">
              <label htmlFor="submitToOFF" className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Submit to OpenFoodFacts
              </label>
              <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                Help improve the global food database by sharing this product information with OpenFoodFacts. 
                This makes the product available for future barcode scans by you and others.
              </p>
              <a 
                href="https://world.openfoodfacts.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                Learn more about OpenFoodFacts <ExternalLink className="w-3 h-3" />
              </a>
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
              Share with other CGM Tracker users
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Other users will be able to find and use this product in their food logs
          </p>
        </div>

        {/* OpenFoodFacts Submission Result */}
        {offSubmissionResult && (
          <div className={`rounded-lg p-3 ${
            offSubmissionResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <p className={`text-sm ${
              offSubmissionResult.success 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {offSubmissionResult.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploadingImage || isSubmittingToOFF || !formData.name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {isSubmitting || isUploadingImage || isSubmittingToOFF ? (
              <>
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                {isUploadingImage ? 'Uploading Photo...' : 
                 isSubmittingToOFF ? 'Submitting to OpenFoodFacts...' : 
                 'Creating Product...'}
              </>
            ) : (
              'Create & Log Product'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}