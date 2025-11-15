'use client';

import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { logger } from '@/lib/logger';

interface FavoriteButtonProps {
  foodId: string;
  foodName: string;
  defaultServingSize?: number;
  defaultServingUnit?: string;
  onFavoriteChange?: (isFavorite: boolean) => void;
  className?: string;
}

export function FavoriteButton({ 
  foodId, 
  foodName: _foodName, 
  defaultServingSize, 
  defaultServingUnit,
  onFavoriteChange,
  className = ''
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    if (user && foodId) {
      checkIfFavorite();
    }
  }, [user, foodId]);

  const checkIfFavorite = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/food/favorites');
      const data = await response.json();
      
      if (response.ok) {
        const favorite = data.favorites?.find((fav: any) => fav.food.id === foodId);
        if (favorite) {
          setIsFavorite(true);
          setFavoriteId(favorite.favoriteId);
        }
      }
    } catch (error) {
      logger.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      if (isFavorite && favoriteId) {
        // Remove from favorites
        const response = await fetch(`/api/food/favorites/${favoriteId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setIsFavorite(false);
          setFavoriteId(null);
          onFavoriteChange?.(false);
        } else {
          const data = await response.json();
          logger.error('Failed to remove favorite:', data.error);
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/food/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodItemId: foodId,
            defaultServingSize,
            defaultServingUnit,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsFavorite(true);
          setFavoriteId(data.favorite.id);
          onFavoriteChange?.(true);
        } else {
          const data = await response.json();
          if (data.error === 'Food is already in favorites') {
            // Already favorited, just update state
            setIsFavorite(true);
            checkIfFavorite(); // Get the favorite ID
          } else {
            logger.error('Failed to add favorite:', data.error);
          }
        }
      }
    } catch (error) {
      logger.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`p-2 rounded-lg transition-colors ${
        isFavorite
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
      } ${className}`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
      )}
    </button>
  );
}