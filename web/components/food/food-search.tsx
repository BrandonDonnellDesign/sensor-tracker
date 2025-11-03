'use client';

import { useState } from 'react';
import { Search, Barcode, Loader2, ShoppingCart, Plus, Heart } from 'lucide-react';
import { BarcodeScanner } from './barcode-scanner';
import { FoodLogForm } from './food-log-form';
import { MultiFoodLogForm } from './multi-food-log-form';
import { CustomFoodForm } from './custom-food-form';
import { FavoritesList } from './favorites-list';
import { FavoriteButton } from './favorite-button';

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

      {/* Mode Toggle */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setSearchMode('search')}
          className={`py-2 px-2 rounded-lg transition-colors text-sm ${
            searchMode === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
          }`}
        >
          <Search className="w-4 h-4 inline mr-1" />
          Search
        </button>
        <button
          onClick={() => setSearchMode('favorites')}
          className={`py-2 px-2 rounded-lg transition-colors text-sm ${
            (searchMode as string) === 'favorites'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
          }`}
        >
          <Heart className="w-4 h-4 inline mr-1" />
          Favorites
        </button>
        <button
          onClick={() => setSearchMode('barcode')}
          className={`py-2 px-2 rounded-lg transition-colors text-sm ${
            searchMode === 'barcode'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
          }`}
        >
          <Barcode className="w-4 h-4 inline mr-1" />
          Scan
        </button>
        <button
          onClick={() => setSearchMode('custom')}
          className={`py-2 px-2 rounded-lg transition-colors text-sm ${
            (searchMode as string) === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Custom
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
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
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
              <button
                onClick={() => setShowScanner(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Barcode className="w-5 h-5 inline mr-2" />
                Start Scanner
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
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
                <button
                  onClick={() => handleBarcodeSearch(barcode)}
                  disabled={!barcode || isSearching}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
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
    </div>
  );
}
