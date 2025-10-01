'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface ImageUploadProps {
  sensorId: string | null;
  userId: string;
  skipDatabase?: boolean;
  onUploadComplete?: (paths: string[]) => void;
  onError?: (error: string) => void;
}

interface UploadPreview {
  file: File;
  objectUrl: string;
  progress: number;
}

export default function ImageUpload({ sensorId, userId, skipDatabase = false, onUploadComplete, onError }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<UploadPreview[]>([]);

  const uploadImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      setUploading(true);

      // Create previews
      const newPreviews: UploadPreview[] = files.map(file => ({
        file,
        objectUrl: URL.createObjectURL(file),
        progress: 0
      }));
      setPreviews(newPreviews);

      const uploadPromises = files.map(async (file, index) => {
        try {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            throw new Error(`${file.name} is not an image file`);
          }

          // Validate file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(`${file.name} exceeds 5MB limit`);
          }

          // Generate a unique file path
          const fileExt = file.name.split('.').pop();
          const timestamp = Date.now();
          const uniqueId = Math.random().toString(36).substring(7);
          const filePath = sensorId 
            ? `${userId}/${sensorId}/${timestamp}-${uniqueId}.${fileExt}`
            : `temp/${userId}/${timestamp}-${uniqueId}.${fileExt}`;

          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('sensor_photos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          // Update progress
          setPreviews(prev => prev.map((p, i) => 
            i === index ? { ...p, progress: 50 } : p
          ));

          // Only create database record if not skipping database
          if (!skipDatabase && sensorId) {
            const { data: dbData, error: dbError } = await supabase
              .from('sensor_photos')
              .insert({
                sensor_id: sensorId,
                user_id: userId,
                file_path: filePath
              })
              .select()
              .single();

            if (dbError) {
              // If database insert fails, clean up the uploaded file
              await supabase.storage
                .from('sensor_photos')
                .remove([filePath]);
              throw new Error(`Failed to save ${file.name}: ${dbError.message}`);
            }
          }

          // Update progress
          setPreviews(prev => prev.map((p, i) => 
            i === index ? { ...p, progress: 100 } : p
          ));

          return filePath;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        }
      });

      const results = await Promise.allSettled(uploadPromises);
      
      // Collect successful uploads
      const successfulPaths = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);

      // Handle errors
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason.message);

      if (errors.length > 0) {
        onError?.(errors.join('\n'));
      }

      if (successfulPaths.length > 0) {
        onUploadComplete?.(successfulPaths);
      }

    } catch (error) {
      console.error('Error uploading images:', error);
      onError?.(error instanceof Error ? error.message : 'Error uploading images');
    } finally {
      // Clean up previews
      previews.forEach(preview => URL.revokeObjectURL(preview.objectUrl));
      setPreviews([]);
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        id="imageUpload"
        accept="image/*"
        className="hidden"
        onChange={uploadImages}
        disabled={uploading}
        multiple
      />
      <label
        htmlFor="imageUpload"
        className={`flex flex-col items-center justify-center w-full min-h-[8rem] border-2 border-dashed rounded-lg cursor-pointer ${
          uploading ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-700'
        } transition-colors`}
      >
        {previews.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 w-full">
            {previews.map((preview, index) => (
              <div key={preview.objectUrl} className="relative aspect-square">
                <Image
                  src={preview.objectUrl}
                  alt={`Preview ${index + 1}`}
                  className="object-cover rounded-lg"
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                {preview.progress > 0 && preview.progress < 100 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="h-2 w-3/4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300" 
                        style={{ width: `${preview.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
              {uploading ? 'Uploading...' : 'Click to upload images'}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Select multiple images (PNG, JPG, GIF up to 5MB each)</p>
          </div>
        )}
      </label>
    </div>
  );
}