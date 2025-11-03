'use client';

import { useState, useEffect } from 'react';
import { Heart, Loader2, Star, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

interface FavoritesListProps {
  onSelectFood: (food: any) => void;
  onRefresh?: () => void;
}

export function FavoritesList({ onSelectFood, onRefresh }: FavoritesListProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFavorite, setEditingFavorite] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/food/favorites');
      const data = await response.json();
      
      if (response.ok) {
        setFavorites(data.favorites || []);
      } else {
        console.error('Failed to load favorites:', data.error);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const response = await fetch(`/api/food/favorites/${favoriteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(fav => fav.favoriteId !== favoriteId));
        onRefresh?.();
      } else {
        const data = await response.json();
        console.error('Failed to remove favorite:', data.error);
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const updateFavorite = async (favoriteId: string, nickname: string) => {
    try {
      const response = await fetch(`/api/food/favorites/${favoriteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });

      if (response.ok) {
        setFavorites(prev => prev.map(fav => 
          fav.favoriteId === favoriteId 
            ? { ...fav, nickname }
            : fav
        ));
        setEditingFavorite(null);
        setEditNickname('');
      } else {
        const data = await response.json();
        console.error('Failed to update favorite:', data.error);
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const handleSelectFood = (favorite: any) => {
    // Create a food object with default serving size from favorite
    const foodWithDefaults = {
      ...favorite.food,
      defaultServingSize: favorite.defaultServingSize,
      defaultServingUnit: favorite.defaultServingUnit,
      nickname: favorite.nickname,
      isFavorite: true,
    };
    onSelectFood(foodWithDefaults);
  };

  const startEditing = (favorite: any) => {
    setEditingFavorite(favorite.favoriteId);
    setEditNickname(favorite.nickname || '');
  };

  const cancelEditing = () => {
    setEditingFavorite(null);
    setEditNickname('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-slate-400">Loading favorites...</span>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <Heart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-slate-400 mb-2">No favorite foods yet</p>
        <p className="text-sm text-gray-500 dark:text-slate-500">
          Add foods to favorites by clicking the heart icon when logging food
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          Favorite Foods
        </h3>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          ({favorites.length})
        </span>
      </div>

      <div className="grid gap-3">
        {favorites.map((favorite) => (
          <div
            key={favorite.favoriteId}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {favorite.food.imageUrl && (
                <img
                  src={favorite.food.imageUrl}
                  alt={favorite.food.name}
                  className="w-16 h-16 object-cover rounded border border-gray-200 dark:border-slate-600"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingFavorite === favorite.favoriteId ? (
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          placeholder="Custom nickname (optional)"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        />
                        <button
                          onClick={() => updateFavorite(favorite.favoriteId, editNickname)}
                          className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-2 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-slate-100">
                          {favorite.nickname || favorite.food.name}
                        </h4>
                        {favorite.nickname && (
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            ({favorite.food.name})
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {favorite.food.isOwnCustom && (
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                              My Custom
                            </span>
                          )}
                          {favorite.food.isCustom && !favorite.food.isOwnCustom && (
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {favorite.food.brand && (
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                        {favorite.food.brand}
                      </p>
                    )}
                    
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-slate-500 mb-2">
                      {favorite.food.calories > 0 && <span>{favorite.food.calories} kcal</span>}
                      {favorite.food.carbs > 0 && <span>{favorite.food.carbs}g carbs</span>}
                      {favorite.food.protein > 0 && <span>{favorite.food.protein}g protein</span>}
                    </div>

                    {(favorite.defaultServingSize || favorite.defaultServingUnit) && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Default: {favorite.defaultServingSize || 1} {favorite.defaultServingUnit || 'serving'}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => startEditing(favorite)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Edit nickname"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFavorite(favorite.favoriteId)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectFood(favorite)}
                  className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  Log This Food
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}