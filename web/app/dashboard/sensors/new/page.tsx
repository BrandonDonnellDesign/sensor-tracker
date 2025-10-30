'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { useGamification } from '@/components/providers/gamification-provider';
import ImageUpload from '@/components/sensors/image-upload';
import { type ExtractedSensorData } from '@/utils/sensor-ocr';

interface SensorModel {
  id: string;
  manufacturer: string;
  model_name: string;
  duration_days: number;
  is_active: boolean;
}

export default function NewSensorPage() {
  const { user } = useAuth();
  const { recordActivity, checkAchievements } = useGamification();
  const router = useRouter();
  
  const [sensorModels, setSensorModels] = useState<SensorModel[]>([]);
  const [selectedSensorModelId, setSelectedSensorModelId] = useState<string>('');
  const [selectedSensorModel, setSelectedSensorModel] = useState<SensorModel | null>(null);
  const [initialPhotos, setInitialPhotos] = useState<string[]>([]);
  const [serialNumber, setSerialNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedSensorData | null>(null);
  const [dateAdded, setDateAdded] = useState(() => {
    const now = new Date();
    // Format for datetime-local input: YYYY-MM-DDTHH:MM in local time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available sensor models
  useEffect(() => {
    const fetchSensorModels = async () => {
      const { data, error } = await (supabase as any)
        .from('sensor_models')
        .select('*')
        .eq('is_active', true)
        .order('manufacturer', { ascending: true })
        .order('model_name', { ascending: true });

      if (error) {
        console.error('Error fetching sensor models:', error);
        setError('Failed to load sensor models. Please ensure the database is properly set up.');
        return;
      }

      setSensorModels((data as SensorModel[]) || []);
      // Don't set default selection - let OCR auto-populate or user select manually
    };

    fetchSensorModels();
  }, []);

  // Handle extracted data from OCR
  const handleDataExtracted = (data: ExtractedSensorData) => {
    setExtractedData(data);
    
    // Auto-populate fields if they're empty and confidence is reasonable
    if (data.confidence > 30) { // Lowered from 60 to 30
      
      if (data.serialNumber && !serialNumber) {
        setSerialNumber(data.serialNumber);
      }
      
      if (data.lotNumber && !lotNumber) {
        setLotNumber(data.lotNumber);
      }
      
      // Try to auto-select sensor model based on manufacturer and model name
      if (data.manufacturer) {
        
        let matchingModel = null;
        
        // First try to match by both manufacturer and model name
        if (data.modelName) {
          matchingModel = sensorModels.find(model => {
            const manufacturerMatch = model.manufacturer.toLowerCase() === data.manufacturer?.toLowerCase();
            const modelMatch = model.model_name.toLowerCase().includes(data.modelName?.toLowerCase() || '');
            return manufacturerMatch && modelMatch;
          });
        }
        
        // Fallback to manufacturer only
        if (!matchingModel) {
          matchingModel = sensorModels.find(model => {
            const match = model.manufacturer.toLowerCase() === data.manufacturer?.toLowerCase();
            return match;
          });
        }
        
        // Auto-select if we found a match and either no model is selected OR confidence is high
        if (matchingModel && (!selectedSensorModelId || data.confidence > 70)) {
          setSelectedSensorModelId(matchingModel.id);
          setSelectedSensorModel(matchingModel);
        }
      }
    }
  };

  // Update selected sensor model when selection changes
  useEffect(() => {
    const model = sensorModels.find(m => m.id === selectedSensorModelId);
    setSelectedSensorModel(model || null);
  }, [selectedSensorModelId, sensorModels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    if (selectedSensorModel?.manufacturer === 'Dexcom' && !lotNumber.trim()) {
      setError('Lot number is required for Dexcom sensors');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert local time to UTC for database storage
      // datetime-local input gives local time, toISOString() converts to UTC
      const localDate = new Date(dateAdded);
      const utcDateString = localDate.toISOString();

      const sensorData: any = {
        user_id: user.id,
        sensor_model_id: selectedSensorModelId,
        serial_number: serialNumber.trim(),
        date_added: utcDateString, // Store as UTC in database
        is_problematic: false,
        ...(selectedSensorModel?.manufacturer === 'Dexcom' && { lot_number: lotNumber.trim() }),
      };

      const { data, error } = await supabase
        .from('sensors')
        .insert([sensorData]) // ✅ must be array
        .select();

      const createdSensor = data?.[0];
      if (createdSensor?.id && initialPhotos.length > 0) {
        
        // For each photo path, move the file to the correct location and create DB record
        await Promise.all(
          initialPhotos.map(async (filePath) => {
            try {
              // Extract the file name from the temp path
              const tempParts = filePath.split('/');
              const fileName = tempParts[tempParts.length - 1];
              
              // Construct the new path
              const newPath = `${user.id}/${createdSensor.id}/${fileName}`;
              
              
              // Copy file to new location
              const { error: copyError } = await supabase
                .storage
                .from('sensor_photos')
                .copy(filePath, newPath);

              if (copyError) {
                console.error('Copy error:', copyError);
                throw copyError;
              }

              // Create database record for the new location
              const { error: dbError } = await supabase
                .from('sensor_photos')
                .insert({
                  sensor_id: createdSensor.id,
                  file_path: newPath,
                  user_id: user.id,
                });

              if (dbError) {
                // If database insert fails, remove the copied file
                await supabase.storage
                  .from('sensor_photos')
                  .remove([newPath]);
                console.error('Database error:', dbError);
                throw dbError;
              }

              // Remove the temp file
              await supabase.storage
                .from('sensor_photos')
                .remove([filePath]);
              
            } catch (err) {
              console.error('Error processing photo:', err);
              throw err;
            }
          })
        );
      }

      if (error) throw error;

      // Record gamification activities
      await recordActivity('sensor_added');
      if (initialPhotos.length > 0) {
        await recordActivity('photo_added');
      }
      
      // Check for new achievements
      await checkAchievements();

      router.push('/dashboard/sensors');
    } catch (err: any) {
      console.error('Error creating sensor:', err);
      let errorMessage = 'Failed to create sensor';
      if (err?.message) errorMessage = err.message;
      else if (err?.details) errorMessage = err.details;
      else if (err?.hint) errorMessage = err.hint;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Link 
          href="/dashboard/sensors" 
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-medium mb-6 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sensors
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Add New Sensor</h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">Record a new CGM sensor for tracking and warranty purposes</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-700 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-semibold text-red-800 dark:text-red-200">Error</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="sensorModel" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Sensor Model *
            </label>
            <select
              id="sensorModel"
              required
              className="input"
              value={selectedSensorModelId}
              onChange={(e) => {
                setSelectedSensorModelId(e.target.value);
                // Clear lot number if switching away from Dexcom
                const selectedModel = sensorModels.find(m => m.id === e.target.value);
                if (selectedModel?.manufacturer !== 'Dexcom') {
                  setLotNumber('');
                }
              }}
            >
              <option value="">Select a sensor model...</option>
              {sensorModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.manufacturer} {model.model_name} ({model.duration_days} days)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Select your specific CGM sensor model
            </p>
          </div>

          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Serial Number *
            </label>
            <input
              type="text"
              id="serialNumber"
              required
              className="input"
              placeholder="Enter sensor serial number"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Usually found on the sensor packaging or applicator
            </p>
          </div>

          {selectedSensorModel?.manufacturer === 'Dexcom' && (
            <div>
              <label htmlFor="lotNumber" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Lot Number *
              </label>
              <input
                type="text"
                id="lotNumber"
                required
                className="input"
                placeholder="Enter lot number"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Found on the sensor packaging (required for Dexcom sensors)
              </p>
            </div>
          )}

          <div>
            <label htmlFor="dateAdded" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Date Applied
            </label>
            <input
              type="datetime-local"
              id="dateAdded"
              className="input"
              value={dateAdded}
              onChange={(e) => setDateAdded(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              When you applied this sensor
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Upload Photos</h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Upload photos of your sensor packaging or any issues you want to document.
                  {initialPhotos.length > 0 && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      ({initialPhotos.length} photo{initialPhotos.length !== 1 ? 's' : ''} added)
                    </span>
                  )}
                </p>
                
                {/* Show extracted data feedback */}
                {extractedData && extractedData.confidence > 20 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                          Data extracted from image ({extractedData.confidence}% confidence)
                        </h4>
                        <div className="mt-1 text-sm text-green-700 dark:text-green-300 space-y-1">
                          {extractedData.manufacturer && (
                            <div>• Manufacturer: {extractedData.manufacturer}</div>
                          )}
                          {extractedData.modelName && (
                            <div>• Model: {extractedData.modelName}</div>
                          )}
                          {extractedData.serialNumber && (
                            <div>• Serial Number: {extractedData.serialNumber}</div>
                          )}
                          {extractedData.lotNumber && (
                            <div>• Lot Number: {extractedData.lotNumber}</div>
                          )}
                          {extractedData.confidence > 30 && (
                            <div className="text-xs mt-2 text-green-600 dark:text-green-400">
                              ✓ Form fields have been auto-populated. Please verify the information is correct.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <ImageUpload
                  sensorId={null}
                  userId={user?.id || ''}
                  skipDatabase={true}
                  onUploadComplete={(paths) => {
                    setInitialPhotos((prev) => [...prev, ...paths]);
                  }}
                  onError={(error) => setError(error)}
                  onDataExtracted={handleDataExtracted}
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-500 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200">Quick Help</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Photo upload functionality will be available in a future update. If you experience sensor issues, you can request replacements:
                  </p>
                  <div className="mt-3 space-y-2">
                    <a
                      href="https://dexcom.custhelp.com/app/webform"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-800 dark:text-blue-200 hover:text-blue-900 dark:hover:text-blue-100 underline"
                    >
                      Dexcom Sensor Replacement
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <br />
                    <a
                      href="https://www.freestyle.abbott/us-en/support/sensorsupportrequest.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-800 dark:text-blue-200 hover:text-blue-900 dark:hover:text-blue-100 underline"
                    >
                      Freestyle Sensor Replacement
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href="/dashboard/sensors"
                className="btn-secondary"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !serialNumber.trim() || !selectedSensorModelId || (selectedSensorModel?.manufacturer === 'Dexcom' && !lotNumber.trim())}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </div>
                ) : (
                  'Add Sensor'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
