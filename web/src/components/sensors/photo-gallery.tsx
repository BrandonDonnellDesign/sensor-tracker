'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

type SensorPhoto = Database['public']['Tables']['sensor_photos']['Row'];

interface PhotoGalleryProps {
  photos: SensorPhoto[];
  sensorId: string;
  userId: string;
  onPhotoDeleted?: (photoId: string) => void;
  onPhotoAdded?: (photo: SensorPhoto) => void;
}

export default function PhotoGallery({ photos, sensorId, userId, onPhotoDeleted, onPhotoAdded }: PhotoGalleryProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Load signed URLs for all photos
  const loadPhotoUrls = useCallback(async () => {
    const urls: Record<string, string> = {};
    for (const photo of photos) {
      try {
        const { data, error } = await supabase.storage
          .from('sensor_photos')
          .createSignedUrl(photo.file_path, 3600);
        
        if (error) throw error;
        if (data?.signedUrl) {
          urls[photo.id] = data.signedUrl;
        }
      } catch (error) {
        console.error(`Error getting signed URL for photo ${photo.id}:`, error);
      }
    }
    setPhotoUrls(urls);
  }, [photos]);

  // Load URLs when photos change
  useEffect(() => {
    loadPhotoUrls();
  }, [loadPhotoUrls]);

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setDeleting(true);
      const photo = photos.find(p => p.id === photoId);
      
      if (!photo) {
        throw new Error('Photo not found');
      }

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('sensor_photos')
        .remove([photo.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('sensor_photos')
        .delete()
        .eq('id', photoId)
        .eq('user_id', userId);

      if (dbError) throw dbError;

      onPhotoDeleted?.(photoId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      setError(error instanceof Error ? error.message : 'Error deleting photo');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative group">
            <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
              {photoUrls[photo.id] ? (
                <Image
                  src={photoUrls[photo.id]}
                  alt="Sensor photo"
                  className="object-cover"
                  fill
                  priority={index < 6} // Prioritize first 6 images (2 rows on mobile, 2 rows on desktop)
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = '/placeholder-image.jpg';
                    console.error('Error loading image:', photo.file_path);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-slate-800">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDeleteConfirm(photo.id)}
              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete photo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {showDeleteConfirm === photo.id && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg space-y-4">
                  <p className="text-sm text-gray-700 dark:text-slate-300">Delete this photo?</p>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}