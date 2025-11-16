'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2, Plus, Search, X, Trash2, Barcode, Camera } from 'lucide-react';
import { logger } from '@/lib/logger';
import { CustomFoodForm } from './custom-food-form';
import { BarcodeScanner } from './barcode-scanner';
import { useCameraPermission } from '@/lib/hooks/use-camera-permission';
import { CameraPermissionDialog } from '@/components/ui/camera-permission-dialog';

interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize: number;
  servingUnit: string;
}

interface SelectedItem extends FoodItem {
  quantity: number;
  displayUnit: string; // The unit being displayed/used for this item
}

interface MultiItemCustomFoodFormProps {
  onCancel: () => void;
  onSuccess: (food: any) => void;
}

export function MultiItemCustomFoodForm({ onCancel, onSuccess }: MultiItemCustomFoodFormProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [customFoodName, setCustomFoodName] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  
  const { permission } = useCameraPermission();

  // Search for food items
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (error) {
        logger.error('Error searching foods:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addItem = (item: FoodItem) => {
    setSelectedItems(prev => [...prev, { ...item, quantity: 1, displayUnit: item.servingUnit }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBarcodeClick = async () => {
    // Check if MediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera is not supported on this device or browser');
      return;
    }

    // If permission is denied, show dialog
    if (permission === 'denied') {
      setShowPermissionDialog(true);
      return;
    }

    // Try to open scanner directly - it will handle permission requests
    setShowScanner(true);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false);
    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/food/barcode?barcode=${barcode}`);
      if (response.ok) {
        const data = await response.json();
        if (data.product) {
          addItem(data.product);
        } else {
          alert('Food not found for this barcode');
        }
      } else {
        alert('Failed to lookup barcode');
      }
    } catch (error) {
      logger.error('Error looking up barcode:', error);
      alert('Failed to lookup barcode');
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    
    await handleBarcodeScanned(manualBarcode.trim());
    setManualBarcode('');
    setShowBarcodeInput(false);
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (isNaN(quantity) || quantity <= 0) return;
    setSelectedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ));
  };

  const updateUnit = (index: number, unit: string) => {
    setSelectedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, displayUnit: unit } : item
    ));
  };

  // Calculate combined nutrition
  const combinedNutrition = selectedItems.reduce((acc, item) => ({
    calories: acc.calories + (item.calories * item.quantity),
    carbs: acc.carbs + (item.carbs * item.quantity),
    protein: acc.protein + (item.protein * item.quantity),
    fat: acc.fat + (item.fat * item.quantity),
    fiber: acc.fiber + ((item.fiber || 0) * item.quantity),
    sugar: acc.sugar + ((item.sugar || 0) * item.quantity),
    sodium: acc.sodium + ((item.sodium || 0) * item.quantity),
  }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

  const handleCreateCustomFood = async () => {
    if (!user || !customFoodName.trim() || selectedItems.length === 0) return;

    try {
      const payload = {
        product_name: customFoodName.trim(),
        brand: 'Custom Recipe',
        serving_size: 1,
        serving_unit: 'serving',
        energy_kcal: combinedNutrition.calories,
        carbohydrates_g: combinedNutrition.carbs,
        proteins_g: combinedNutrition.protein,
        fat_g: combinedNutrition.fat,
        fiber_g: combinedNutrition.fiber || null,
        sugars_g: combinedNutrition.sugar || null,
        sodium_mg: combinedNutrition.sodium || null,
        is_public: false,
        recipe_items: selectedItems.map(item => ({
          food_id: item.id,
          quantity: item.quantity,
          name: item.name
        }))
      };

      const response = await fetch('/api/food/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create custom food');
      }

      const { item: foodItem } = await response.json();

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
      alert('Failed to create custom food. Please try again.');
    }
  };



  if (showManualForm) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Add Ingredient Manually</h3>
          <button
            onClick={() => setShowManualForm(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <CustomFoodForm
          onCancel={() => setShowManualForm(false)}
          onSuccess={(food) => {
            addItem(food);
            setShowManualForm(false);
          }}
        />
      </div>
    );
  }

  if (showScanner) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Scan Barcode</h3>
          <button
            onClick={() => setShowScanner(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Recipe from Multiple Items
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
          Search or scan items to combine into a custom recipe
        </p>
      </div>

      {/* Camera Permission Dialog */}
      <CameraPermissionDialog
        isOpen={showPermissionDialog}
        onRequestPermission={async () => {
          // This will be handled by the useCameraPermission hook
          return permission === 'granted';
        }}
        onCancel={() => setShowPermissionDialog(false)}
      />

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            Search and add ingredients
          </label>
          <button
            onClick={() => setShowManualForm(true)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add manually
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for foods to add..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>
          <button
            onClick={handleBarcodeClick}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-2"
            title="Scan barcode with camera"
          >
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button
            onClick={() => setShowBarcodeInput(!showBarcodeInput)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-2"
            title="Enter barcode manually"
          >
            <Barcode className="w-5 h-5" />
          </button>
        </div>

        {/* Manual Barcode Input */}
        {showBarcodeInput && (
          <form onSubmit={handleManualBarcodeSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Enter barcode number..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!manualBarcode.trim() || isSearching}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lookup'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBarcodeInput(false);
                setManualBarcode('');
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-600 border-b border-gray-100 dark:border-slate-600 last:border-b-0"
              >
                <div className="font-medium text-gray-900 dark:text-slate-100">{item.name}</div>
                {item.brand && (
                  <div className="text-sm text-gray-500 dark:text-slate-400">{item.brand}</div>
                )}
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {item.calories} cal • {item.carbs}g carbs • {item.protein}g protein • {item.fat}g fat
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
            Selected Ingredients ({selectedItems.length})
          </h4>
          <div className="space-y-2">
            {selectedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-slate-100 truncate">{item.name}</div>
                  {item.brand && (
                    <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{item.brand}</div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {(item.calories * item.quantity).toFixed(0)} cal • 
                    {(item.carbs * item.quantity).toFixed(1)}g carbs
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) updateQuantity(index, val);
                      }}
                      min="0.1"
                      step="0.1"
                      placeholder="1"
                      className="w-16 px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm text-center"
                    />
                    <select
                      value={item.displayUnit}
                      onChange={(e) => updateUnit(index, e.target.value)}
                      className="w-20 px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
                    >
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                      <option value="lb">lb</option>
                      <option value="cup">cup</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                      <option value="serving">serving</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combined Nutrition Summary */}
      {selectedItems.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Combined Nutrition (Total)
          </h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-blue-600 dark:text-blue-400 font-semibold">
                {combinedNutrition.calories.toFixed(0)}
              </div>
              <div className="text-blue-700 dark:text-blue-300 text-xs">Calories</div>
            </div>
            <div>
              <div className="text-blue-600 dark:text-blue-400 font-semibold">
                {combinedNutrition.carbs.toFixed(1)}g
              </div>
              <div className="text-blue-700 dark:text-blue-300 text-xs">Carbs</div>
            </div>
            <div>
              <div className="text-blue-600 dark:text-blue-400 font-semibold">
                {combinedNutrition.protein.toFixed(1)}g
              </div>
              <div className="text-blue-700 dark:text-blue-300 text-xs">Protein</div>
            </div>
            <div>
              <div className="text-blue-600 dark:text-blue-400 font-semibold">
                {combinedNutrition.fat.toFixed(1)}g
              </div>
              <div className="text-blue-700 dark:text-blue-300 text-xs">Fat</div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Name */}
      {selectedItems.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Recipe Name *
          </label>
          <input
            type="text"
            value={customFoodName}
            onChange={(e) => setCustomFoodName(e.target.value)}
            placeholder="e.g., My Breakfast Bowl"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      )}

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
          onClick={handleCreateCustomFood}
          disabled={selectedItems.length === 0 || !customFoodName.trim()}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Recipe
        </button>
      </div>
    </div>
  );
}
