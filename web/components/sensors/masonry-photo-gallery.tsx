'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase-client';
import { Database } from '@/lib/database.types';

type SensorPhoto = Database['public']['Tables']['sensor_photos']['Row'];

// --- TypeScript Interfaces ---
interface MasonryItem {
  id: string;
  imageUrl: string;
  title: string;
  photo: SensorPhoto;
}

interface GridItemProps {
  item: MasonryItem;
  onDelete: (photoId: string) => void;
  deleting: boolean;
}

interface MasonryPhotoGalleryProps {
  photos: SensorPhoto[];
  sensorId: string;
  userId: string;
  onPhotoDeleted?: (photoId: string) => void;
}

// --- SVG Icons ---
const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white group-hover:text-pink-500 transition-colors">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white group-hover:text-red-500 transition-colors">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

// --- GridItem Component ---
const GridItem: React.FC<GridItemProps> = ({ item, onDelete, deleting }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete(item.photo.id);
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div
      className="mb-3 break-inside-avoid relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
        className="w-full h-auto rounded-lg shadow-md"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = `https://placehold.co/400x300/fecaca/333333?text=Image+Not+Found`;
        }}
      />
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg"
          >
            <div className="p-3 h-full flex flex-col justify-between">
              <div className="flex justify-start gap-2">
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  className="p-1.5 bg-black/30 rounded-md backdrop-blur-sm group"
                >
                  <HeartIcon />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  className="p-1.5 bg-black/30 rounded-md backdrop-blur-sm group"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <DeleteIcon />
                </motion.button>
              </div>
              <p className="text-white font-semibold text-sm truncate">{item.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 p-4 rounded-lg space-y-4 max-w-xs mx-4"
          >
            <p className="text-sm text-gray-700 dark:text-slate-300">Delete this photo?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

// --- MasonryGrid Component ---
const MasonryGrid: React.FC<{ items: MasonryItem[]; onDelete: (photoId: string) => void; deleting: boolean }> = ({ items, onDelete, deleting }) => {
  return (
    <div
      className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
      style={{ columnWidth: '220px' }}
    >
      {items.map((item) => (
        <GridItem key={item.id} item={item} onDelete={onDelete} deleting={deleting} />
      ))}
    </div>
  );
};

// --- Main MasonryPhotoGallery Component ---
export default function MasonryPhotoGallery({ photos, sensorId: _sensorId, userId, onPhotoDeleted }: MasonryPhotoGalleryProps) {
  const [masonryItems, setMasonryItems] = useState<MasonryItem[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load signed URLs and convert photos to masonry items
  const loadMasonryItems = useCallback(async () => {
    const supabase = createClient();
    const items: MasonryItem[] = [];
    
    for (const photo of photos) {
      try {
        const { data, error } = await supabase.storage
          .from('sensor_photos')
          .createSignedUrl(photo.file_path, 3600);
        
        if (error) throw error;
        if (data?.signedUrl) {
          items.push({
            id: photo.id,
            imageUrl: data.signedUrl,
            title: `Sensor Photo ${new Date(photo.created_at).toLocaleDateString()}`,
            photo: photo
          });
        }
      } catch (error) {
        console.error(`Error getting signed URL for photo ${photo.id}:`, error);
      }
    }
    
    setMasonryItems(items);
  }, [photos]);

  // Load items when photos change
  useEffect(() => {
    loadMasonryItems();
  }, [loadMasonryItems]);

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setDeleting(true);
      const photo = photos.find(p => p.id === photoId);
      
      if (!photo) {
        throw new Error('Photo not found');
      }

      // Delete from storage first
      const supabase = createClient();
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

      // Update local state
      setMasonryItems(prev => prev.filter(item => item.id !== photoId));
      onPhotoDeleted?.(photoId);
    } catch (error) {
      console.error('Error deleting photo:', error);
      setError(error instanceof Error ? error.message : 'Error deleting photo');
    } finally {
      setDeleting(false);
    }
  };

  if (masonryItems.length === 0) {
    return (
      <div className='text-center py-8 bg-gray-50 dark:bg-slate-800/50 rounded-lg'>
        <svg
          className='mx-auto h-12 w-12 text-gray-400 dark:text-slate-500'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 13a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
        <p className='mt-2 text-sm text-gray-500 dark:text-slate-400'>
          No photos added yet
        </p>
      </div>
    );
  }

  return (
    <div className="font-sans transition-colors">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      
      <div className="container mx-auto px-0">
        <MasonryGrid items={masonryItems} onDelete={handleDeletePhoto} deleting={deleting} />
      </div>
    </div>
  );
}