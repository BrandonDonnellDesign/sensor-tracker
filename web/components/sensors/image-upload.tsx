'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createWorker, PSM } from 'tesseract.js';
import { supabase } from '@/lib/supabase';
import { extractSensorData, type ExtractedSensorData } from '@/utils/sensor-ocr';

interface ImageUploadProps {
  sensorId: string | null;
  userId: string;
  skipDatabase?: boolean;
  onUploadComplete?: (paths: string[]) => void;
  onError?: (error: string) => void;
  onDataExtracted?: (data: ExtractedSensorData) => void;
}

interface UploadPreview {
  file: File;
  objectUrl: string;
  progress: number;
  ocrProgress?: number;
  extractedData?: ExtractedSensorData;
}

export default function ImageUpload({ sensorId, userId, skipDatabase = false, onUploadComplete, onError, onDataExtracted }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<UploadPreview[]>([]);
  const [processingOCR, setProcessingOCR] = useState(false);

  const processImageWithOCR = async (file: File, index: number) => {
    try {
      // Update OCR progress
      setPreviews(prev => prev.map((p, i) => 
        i === index ? { ...p, ocrProgress: 0 } : p
      ));

      const worker = await createWorker('eng');
      
      // Configure OCR for medical device labels
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-:(). ',
        tessedit_pageseg_mode: PSM.AUTO,
        tessedit_ocr_engine_mode: 2,
      });

      setPreviews(prev => prev.map((p, i) => 
        i === index ? { ...p, ocrProgress: 25 } : p
      ));

      let { data: { text } } = await worker.recognize(file);
      
      // Fallback to different configuration if needed
      if (!text || text.trim().length < 10) {
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-:(). ',
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          tessedit_ocr_engine_mode: 1,
        });
        
        const { data: { text: text2 } } = await worker.recognize(file);
        if (text2 && text2.trim().length > text.trim().length) {
          text = text2;
        }
      }
      
      setPreviews(prev => prev.map((p, i) => 
        i === index ? { ...p, ocrProgress: 75 } : p
      ));

      // Check if OCR found any text
      if (!text || text.trim().length === 0) {
        setPreviews(prev => prev.map((p, i) => 
          i === index ? { ...p, ocrProgress: 100, extractedData: { confidence: 0 } } : p
        ));
        await worker.terminate();
        return;
      }
      
      // Extract sensor data from OCR text
      const extractedData = extractSensorData(text);

      setPreviews(prev => prev.map((p, i) => 
        i === index ? { ...p, ocrProgress: 100, extractedData } : p
      ));

      // Notify parent component if reasonable confidence data was found
      if (extractedData.confidence > 30 && onDataExtracted) {
        onDataExtracted(extractedData);
      }

      await worker.terminate();
      
    } catch (error) {
      console.error('OCR processing error:', error);
      setPreviews(prev => prev.map((p, i) => 
        i === index ? { ...p, ocrProgress: 0 } : p
      ));
    }
  };

  const uploadImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      setUploading(true);
      setProcessingOCR(true);

      // Create previews
      const newPreviews: UploadPreview[] = files.map(file => ({
        file,
        objectUrl: URL.createObjectURL(file),
        progress: 0,
        ocrProgress: 0
      }));
      setPreviews(newPreviews);

      // Process OCR for each image in parallel (but limit concurrency)
      const ocrPromises = files.map((file, index) => 
        processImageWithOCR(file, index)
      );
      
      // Start OCR processing
      Promise.all(ocrPromises).finally(() => {
        setProcessingOCR(false);
      });

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
          const { error: uploadError } = await supabase.storage
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
            const { error: dbError } = await supabase
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
                
                {/* Upload Progress */}
                {preview.progress > 0 && preview.progress < 100 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-center">
                      <div className="h-2 w-3/4 bg-gray-200 rounded-full overflow-hidden mx-auto mb-2">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300" 
                          style={{ width: `${preview.progress}%` }}
                        />
                      </div>
                      <p className="text-white text-xs">Uploading...</p>
                    </div>
                  </div>
                )}
                
                {/* OCR Progress */}
                {preview.ocrProgress !== undefined && preview.ocrProgress < 100 && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                    {preview.ocrProgress === 0 ? 'Reading...' : `${preview.ocrProgress}%`}
                  </div>
                )}
                
                {/* Extracted Data Indicator */}
                {preview.extractedData && preview.extractedData.confidence > 50 && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Data Found
                  </div>
                )}
                
                {/* Show extracted data */}
                {preview.extractedData && preview.extractedData.confidence > 30 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-2 rounded-b-lg">
                    <div className="space-y-1">
                      {preview.extractedData.manufacturer && (
                        <div>Brand: {preview.extractedData.manufacturer}</div>
                      )}
                      {preview.extractedData.modelName && (
                        <div>Model: {preview.extractedData.modelName}</div>
                      )}
                      {preview.extractedData.serialNumber && (
                        <div>Serial: {preview.extractedData.serialNumber}</div>
                      )}
                      {preview.extractedData.lotNumber && (
                        <div>Lot: {preview.extractedData.lotNumber}</div>
                      )}
                      <div className="text-gray-300">
                        Confidence: {preview.extractedData.confidence}%
                      </div>
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
              {uploading ? 'Uploading...' : processingOCR ? 'Reading text from images...' : 'Click to upload images'}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Upload sensor package photos to automatically extract serial numbers and lot numbers
            </p>
          </div>
        )}
      </label>
    </div>
  );
}