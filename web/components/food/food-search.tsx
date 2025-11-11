'use client';

import { useState } from 'react';
import { Search, Barcode, Loader2, ShoppingCart, Plus, Heart, Camera, Syringe } from 'lucide-react';
import { BarcodeScanner } from './barcode-scanner';
import { FoodLogForm } from './food-log-form';
import { IntegratedMealLogger } from './integrated-meal-logger';
import { MultiFoodLogForm } from './multi-food-log-form';
import { CustomFoodForm } from './custom-food-form';
import { FavoritesList } from './favorites-list';
import { FavoriteButton } from './favorite-button';
import { CameraPermissionDialog } from '@/components/ui/camera-permission-dialog';
import { useCameraPermission } from '@/lib/hooks/use-camera-permission';

type SearchMode = 'search' | 'barcode' | 'custom' | 'favorites';

interface FoodSearchProps {
  onFoodLogged: () => void;
}

export function FoodSearch({ onFoodLogged }: FoodSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [barcode, setBarcode] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [mealItems, setMealItems] = useState<any[]>([]);
  const [showMealReview, setShowMealReview] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('search');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [useIntegratedLogger, setUseIntegratedLogger] = useState(true);

  const { permission, requestPermission, hasCamera, isLoading: permissionLoading, error: permissionError } = useCameraPermission();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      // Combine local and remote results
      const combined = [...(data.local || []), ...(data.remote || [])];
      setSearchResults(combined);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarcodeSearch = async (code: string) => {
    setBarcode(code);
    setIsSearching(true);
    try {
      const response = await fetch(`/api/food/barcode?barcode=${code}`);
      const data = await response.json();
      
      if (data.product) {
        setSelectedFood(data.product);
        setShowScanner(false);
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartScanner = async () => {
    if (!hasCamera) {
      alert('No camera available on this device');
      return;
    }

    if (permission === 'granted') {
      setShowScanner(true);
    } else if (permission === 'denied') {
      setShowPermissionDialog(true);
    } else {
      // Request permission
      setShowPermissionDialog(true);
    }
  };

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPermissionDialog(false);
      setShowScanner(true);
    }
    return granted;
  };





  const handleAddToMeal = (food: any) => {
    setMealItems([...mealItems, food]);
    setSelectedFood(null);
    setSearchResults([]);
    setSearchQuery('');
    setShowMealReview(false);
  };

  if (showMealReview && mealItems.length > 0) {
    return (
      <MultiFoodLogForm
        items={mealItems}
        onCancel={() => {
          setMealItems([]);
          setShowMealReview(false);
        }}
        onSuccess={() => {
          setMealItems([]);
          setShowMealReview(false);
          onFoodLogged();
        }}
        onAddMore={() => setShowMealReview(false)}
      />
    );
  }

  if (selectedFood) {
    if (useIntegratedLogger) {
      return (
        <IntegratedMealLogger
          food={selectedFood}
          onCancel={() => {
            setSelectedFood(null);
            setSearchResults([]);
            setSearchQuery('');
            setBarcode('');
          }}
          onSuccess={onFoodLogged}
        />
      );
    } else {
      return (
        <FoodLogForm
          food={selectedFood}
          onCancel={() => {
            setSelectedFood(null);
            setSearchResults([]);
            setSearchQuery('');
            setBarcode('');
          }}
          onSuccess={onFoodLogged}
          onAddToMeal={handleAddToMeal}
        />
      );
    }
  }

  if (searchMode === 'custom') {
    return (
      <CustomFoodForm
        onCancel={() => setSearchMode('search')}
        onSuccess={(food) => {
          setSelectedFood(food);
          setSearchMode('search');
        }}
      />
    );
  }

  if (searchMode === 'favorites') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSearchMode('search')}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Search
          </button>
        </div>
        <FavoritesList 
          onSelectFood={(food) => {
            setSelectedFood(food);
            setSearchMode('search');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Meal Cart Badge */}
      {mealItems.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {mealItems.length} item{mealItems.length > 1 ? 's' : ''} in meal
              </span>
            </div>
            <button
              onClick={() => setShowMealReview(true)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
            >
              Review Meal
            </button>
          </div>
        </div>
      )}

      {/* Logging Mode Toggle */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Syringe className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Smart Meal + Insulin Logging
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useIntegrated"
              checked={useIntegratedLogger}
              onChange={(e) => setUseIntegratedLogger(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="useIntegrated" className="text-xs text-orange-700 dark:text-orange-300">
              Auto-calculate insulin
            </label>
          </div>
        </div>
        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
          {useIntegratedLogger 
            ? 'Automatically calculates and logs insulin based on carbs and current glucose'
            : 'Log food only without insulin calculation'
          }
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setSearchMode('search')}
          className={`py-3 md:py-2 px-2 rounded-lg transition-colors text-sm touch-manipulation ${
            searchMode === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
          }`}
        >
          <Search className="w-4 h-4 inline mr-1" />
          <span className="hidden sm:inline">Search</span>
        </button>
        <button
          onClick={() => setSearchMode('favorites')}
          className={`py-3 md:py-2 px-2 rounded-lg transition-colors text-sm touch-manipulation ${
            (searchMode as string) === 'favorites'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
          }`}
        >
          <Heart className="w-4 h-4 inline mr-1" />
          <span className="hidden sm:inline">Favorites</span>
        </button>
        <button
          onClick={() => setSearchMode('barcode')}
          className={`py-3 md:py-2 px-2 rounded-lg transition-colors text-sm touch-manipulation ${
            searchMode === 'barcode'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
          }`}
        >
          <Barcode className="w-4 h-4 inline mr-1" />
          <span className="hidden sm:inline">Scan</span>
        </button>
        <button
          onClick={() => setSearchMode('custom')}
          className={`py-3 md:py-2 px-2 rounded-lg transition-colors text-sm touch-manipulation ${
            (searchMode as string) === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-1" />
          <span className="hidden sm:inline">Custom</span>
        </button>
      </div>



      {/* Search Mode */}
      {searchMode === 'search' && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for food..."
              className="flex-1 px-4 py-3 md:py-2 text-base md:text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors touch-manipulation"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 md:px-6 py-3 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 touch-manipulation min-w-[60px] flex items-center justify-center"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="hidden md:inline">Search</span>}
              {isSearching ? null : <Search className="w-5 h-5 md:hidden" />}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((food, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => setSelectedFood(food)}
                      className="flex-1 p-4 text-left"
                    >
                      <div className="flex items-center gap-4">
                        {food.imageUrl && (
                          <img
                            src={food.imageUrl}
                            alt={food.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-slate-100">
                              {food.name}
                            </h3>
                            {food.isOwnCustom && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                My Custom
                              </span>
                            )}
                            {food.isCustom && !food.isOwnCustom && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                Custom
                              </span>
                            )}
                          </div>
                          {food.brand && (
                            <p className="text-sm text-gray-600 dark:text-slate-400">{food.brand}</p>
                          )}
                          <div className="flex gap-4 mt-1 text-xs text-gray-500 dark:text-slate-500">
                            {food.calories && <span>{food.calories} kcal</span>}
                            {food.carbs && <span>{food.carbs}g carbs</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                    <div className="pr-2">
                      <FavoriteButton
                        foodId={food.id}
                        foodName={food.name}
                        defaultServingSize={food.servingSize}
                        defaultServingUnit={food.servingUnit}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                No results found for "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchMode('custom')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create Custom Food
              </button>
            </div>
          ) : null}
        </>
      )}



      {/* Barcode Mode */}
      {searchMode === 'barcode' && (
        <div className="space-y-4">
          {!showScanner ? (
            <div className="text-center py-8">
              {/* Camera Status Info */}
              {permissionLoading ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    Checking camera availability...
                  </p>
                </div>
              ) : !hasCamera ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <Camera className="w-8 h-8 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    No camera detected on this device
                  </p>
                </div>
              ) : permission === 'denied' ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <Camera className="w-8 h-8 mx-auto text-red-600 dark:text-red-400 mb-2" />
                  <p className="text-red-800 dark:text-red-200 text-sm mb-2">
                    Camera access was denied
                  </p>
                  <p className="text-red-700 dark:text-red-300 text-xs">
                    Enable camera permissions to scan barcodes
                  </p>
                </div>
              ) : null}

              <button
                onClick={handleStartScanner}
                disabled={!hasCamera || permissionLoading}
                className="px-6 py-4 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-base md:text-sm font-medium"
              >
                {permissionLoading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline mr-2" />
                    Checking Camera...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 inline mr-2" />
                    {permission === 'denied' ? 'Request Camera Access' : 'Start Scanner'}
                  </>
                )}
              </button>

              <p className="mt-4 text-sm text-gray-600 dark:text-slate-400">
                Or enter barcode manually:
              </p>
              <div className="flex gap-2 mt-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch(barcode)}
                  placeholder="Enter barcode..."
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="flex-1 px-4 py-3 md:py-2 text-base md:text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors touch-manipulation"
                  autoComplete="off"
                />
                <button
                  onClick={() => handleBarcodeSearch(barcode)}
                  disabled={!barcode || isSearching}
                  className="px-4 py-3 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 touch-manipulation min-w-[80px]"
                >
                  Lookup
                </button>
              </div>
            </div>
          ) : (
            <BarcodeScanner
              onScan={handleBarcodeSearch}
              onClose={() => setShowScanner(false)}
            />
          )}
        </div>
      )}

      {/* Camera Permission Dialog */}
      <CameraPermissionDialog
        isOpen={showPermissionDialog}
        onRequestPermission={handlePermissionRequest}
        onCancel={() => setShowPermissionDialog(false)}
        error={permissionError}
        isLoading={permissionLoading}
      />
    </div>
  );
}
