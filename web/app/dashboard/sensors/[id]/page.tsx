'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { Database } from '@/lib/database.types';
import ImageUpload from '@/components/sensors/image-upload';
import PhotoGallery from '@/components/sensors/photo-gallery';

type Sensor = Database['public']['Tables']['sensors']['Row'];
type SensorPhoto = Database['public']['Tables']['sensor_photos']['Row'];

interface SensorModel {
  id: string;
  manufacturer: string;
  model_name: string;
  duration_days: number;
  is_active: boolean;
}

export default function SensorDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const sensorId = params.id as string;

  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingSerial, setEditingSerial] = useState(false);
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [editingLot, setEditingLot] = useState(false);
  const [newLotNumber, setNewLotNumber] = useState('');
  const [editingDate, setEditingDate] = useState(false);
  const [newDateAdded, setNewDateAdded] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [newIssueNotes, setNewIssueNotes] = useState('');
  const [photos, setPhotos] = useState<SensorPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [sensorModels, setSensorModels] = useState<SensorModel[]>([]);
  const [editingSensorModel, setEditingSensorModel] = useState(false);
  const [newSensorModelId, setNewSensorModelId] = useState('');

  const fetchSensor = useCallback(async () => {
    if (!user?.id || !sensorId) return;

    try {
      const { data, error } = await (supabase as any)
        .from('sensors')
        .select(`
          *,
          sensorModel:sensor_models(*)
        `)
        .eq('id', sensorId)
        .eq('user_id', user.id) // Ensure user can only view their own sensors
        .eq('is_deleted', false) // Don't show deleted sensors
        .single();

      if (error) throw error;
      setSensor(data);
    } catch (error) {
      console.error('Error fetching sensor:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch sensor'
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id, sensorId]);

  const fetchPhotos = useCallback(async () => {
    if (!user?.id || !sensorId) return;

    try {
      const { data, error } = await supabase
        .from('sensor_photos')
        .select('*')
        .eq('sensor_id', sensorId)
        .eq('user_id', user.id);

      if (error) throw error;
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
      // Don't set error state as it might override more important sensor errors
    } finally {
      setLoadingPhotos(false);
    }
  }, [user?.id, sensorId]);

  useEffect(() => {
    fetchSensor();
    fetchPhotos();
  }, [fetchSensor, fetchPhotos]);

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
        return;
      }

      setSensorModels(data || []);
    };

    fetchSensorModels();
  }, []);



  const toggleProblematic = async () => {
    if (!sensor || !user?.id) return; // Early return if sensor or user ID is missing

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('sensors')
        .update({
          is_problematic: !sensor.is_problematic,
          issue_notes: !sensor.is_problematic ? 'Marked as problematic' : null,
        })
        .eq('id', sensor.id)
        .eq('user_id', user.id); // Safe: user.id is guaranteed to exist here

      if (error) throw error;

      setSensor({
        ...sensor,
        is_problematic: !sensor.is_problematic,
        issue_notes: !sensor.is_problematic ? 'Marked as problematic' : null,
      });
    } catch (error) {
      console.error('Error updating sensor:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update sensor'
      );
    } finally {
      setUpdating(false);
    }
  };
  const updateDateAdded = async () => {
    if (!sensor || !user?.id || !newDateAdded) return;

    setUpdating(true);
    try {
      // Create a Date object from the local datetime input and convert to ISO string
      // This ensures the timestamp represents the exact local time the user selected
      const localDateTime = new Date(newDateAdded + ':00'); // Add seconds if missing
      const isoString = localDateTime.toISOString();

      const { error } = await supabase
        .from('sensors')
        .update({ date_added: isoString })
        .eq('id', sensor.id)
        .eq('user_id', user.id); // Ensure user can only update their own sensors

      if (error) throw error;

      setSensor({
        ...sensor,
        date_added: isoString,
      });
      setEditingDate(false);
      setNewDateAdded('');
    } catch (error) {
      console.error('Error updating date:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update date'
      );
    } finally {
      setUpdating(false);
    }
  };

  const cancelDateEdit = () => {
    setEditingDate(false);
    setNewDateAdded('');
  };

  const startDateEdit = () => {
    if (sensor) {
      setNewDateAdded(formatDateForInput(sensor.date_added));
      setEditingDate(true);
    }
  };

  const updateSensorModel = async () => {
    if (!sensor || !user?.id || !newSensorModelId) return;

    setUpdating(true);
    try {
      const { error } = await (supabase as any)
        .from('sensors')
        .update({ sensor_model_id: newSensorModelId })
        .eq('id', sensor.id)
        .eq('user_id', user.id); // Ensure user can only update their own sensors

      if (error) throw error;

      // Update local state - we need to refetch to get the updated sensor model data
      await fetchSensor();
      setEditingSensorModel(false);
      setNewSensorModelId('');
    } catch (error) {
      console.error('Error updating sensor model:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update sensor model'
      );
    } finally {
      setUpdating(false);
    }
  };

  const cancelSensorModelEdit = () => {
    setEditingSensorModel(false);
    setNewSensorModelId('');
  };

  const updateSerialNumber = async () => {
    if (!sensor || !user?.id || !newSerialNumber.trim()) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('sensors')
        .update({ serial_number: newSerialNumber.trim() })
        .eq('id', sensor.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSensor({
        ...sensor,
        serial_number: newSerialNumber.trim(),
      });
      setEditingSerial(false);
      setNewSerialNumber('');
    } catch (error) {
      console.error('Error updating serial number:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update serial number'
      );
    } finally {
      setUpdating(false);
    }
  };

  const cancelSerialEdit = () => {
    setEditingSerial(false);
    setNewSerialNumber('');
  };

  const startSerialEdit = () => {
    if (sensor) {
      setNewSerialNumber(sensor.serial_number);
      setEditingSerial(true);
    }
  };

  const updateLotNumber = async () => {
    if (!sensor || !user?.id) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('sensors')
        .update({ lot_number: newLotNumber.trim() || null })
        .eq('id', sensor.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSensor({
        ...sensor,
        lot_number: newLotNumber.trim() || null,
      });
      setEditingLot(false);
      setNewLotNumber('');
    } catch (error) {
      console.error('Error updating lot number:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update lot number'
      );
    } finally {
      setUpdating(false);
    }
  };

  const cancelLotEdit = () => {
    setEditingLot(false);
    setNewLotNumber('');
  };

  const startLotEdit = () => {
    if (sensor) {
      setNewLotNumber(sensor.lot_number || '');
      setEditingLot(true);
    }
  };

  const updateIssueNotes = async () => {
    if (!sensor || !user?.id) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('sensors')
        .update({ 
          issue_notes: newIssueNotes.trim() || null,
          is_problematic: newIssueNotes.trim() ? true : sensor.is_problematic // Mark as problematic if notes are added
        })
        .eq('id', sensor.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSensor({
        ...sensor,
        issue_notes: newIssueNotes.trim() || null,
        is_problematic: newIssueNotes.trim() ? true : sensor.is_problematic,
      });
      setEditingNotes(false);
      setNewIssueNotes('');
    } catch (error) {
      console.error('Error updating issue notes:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update issue notes'
      );
    } finally {
      setUpdating(false);
    }
  };

  const cancelNotesEdit = () => {
    setEditingNotes(false);
    setNewIssueNotes('');
  };

  const startNotesEdit = () => {
    if (sensor) {
      setNewIssueNotes(sensor.issue_notes || '');
      setEditingNotes(true);
    }
  };

  const startSensorModelEdit = () => {
    if (sensor) {
      // For backward compatibility, try to get sensor_model_id, otherwise it might be null
      const currentModelId = (sensor as any).sensor_model_id || '';
      setNewSensorModelId(currentModelId);
      setEditingSensorModel(true);
    }
  };

  const deleteSensor = async () => {
    if (!sensor || !user?.id) return;

    setDeleting(true);
    try {
      // Soft delete by setting is_deleted to true
      const { error } = await supabase
        .from('sensors')
        .update({ is_deleted: true })
        .eq('id', sensor.id)
        .eq('user_id', user.id); // Ensure user can only delete their own sensors

      if (error) throw error;

      // Redirect to sensors list after successful deletion
      router.push('/dashboard/sensors');
    } catch (error) {
      console.error('Error deleting sensor:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to delete sensor'
      );
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateForInput = (dateString: string) => {
    // Convert stored UTC timestamp back to local time for datetime-local input
    const utcDate = new Date(dateString);
    const localTime = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
    return localTime.toISOString().slice(0, 16);
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  if (error || !sensor) {
    return (
      <div className='max-w-2xl mx-auto'>
        <div className='bg-red-50 border border-red-200 rounded-md p-4'>
          <div className='flex'>
            <div className='flex-shrink-0'>
              <svg
                className='h-5 w-5 text-red-400'
                viewBox='0 0 20 20'
                fill='currentColor'>
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-red-800'>Error</h3>
              <p className='text-sm text-red-700 mt-1'>
                {error || 'Sensor not found'}
              </p>
              <Link
                href='/dashboard/sensors'
                className='text-sm text-red-800 underline mt-2 hover:text-red-900'>
                Back to Sensors
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto space-y-8'>
      <div>
        <Link
          href='/dashboard/sensors'
          className='inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-medium mb-6 transition-colors'>
          <svg
            className='w-4 h-4 mr-2'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
          Back to Sensors
        </Link>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-slate-100'>
              {sensor.serial_number}
            </h1>
            <p className='text-lg text-gray-600 dark:text-slate-400 mt-2'>
              {(sensor as any).sensorModel
                ? `${(sensor as any).sensorModel.manufacturer} ${(sensor as any).sensorModel.model_name} • Sensor Details & Management`
                : sensor.sensor_type === 'dexcom' ? 'Dexcom • Sensor Details & Management' : 'Abbott FreeStyle Libre • Sensor Details & Management'
              }
            </p>
          </div>
          <div className='flex items-center space-x-3'>
            <div
              className={`w-4 h-4 rounded-full ${
                sensor.is_problematic ? 'bg-red-400' : 'bg-green-400'
              }`}
            />
            <span
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                sensor.is_problematic
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}>
              {sensor.is_problematic ? 'Problematic' : 'Normal'}
            </span>
          </div>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main Info */}
        <div className='lg:col-span-2 space-y-6'>
          <div className='card'>
            <h2 className='text-lg font-semibold mb-4'>Sensor Information</h2>
            <dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div>
                <dt className='text-sm font-medium text-gray-500 dark:text-slate-400'>
                  Sensor Model
                </dt>
                <dd className='mt-1'>
                  {editingSensorModel ? (
                    <div className='flex items-center space-x-2'>
                      <select
                        value={newSensorModelId}
                        onChange={(e) => setNewSensorModelId(e.target.value)}
                        className='text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      >
                        <option value="">Select a sensor model...</option>
                        {sensorModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.manufacturer} {model.model_name} ({model.duration_days} days)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={updateSensorModel}
                        disabled={updating || !newSensorModelId}
                        className='text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
                        {updating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelSensorModelEdit}
                        disabled={updating}
                        className='text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className='flex items-center space-x-2'>
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'>
                        {(sensor as any).sensorModel
                          ? `${(sensor as any).sensorModel.manufacturer} ${(sensor as any).sensorModel.model_name}`
                          : sensor.sensor_type === 'dexcom' ? 'Dexcom G6' : 'Abbott FreeStyle Libre'
                        }
                      </span>
                      {sensorModels.length > 0 && (
                        <button
                          onClick={startSensorModelEdit}
                          className='text-xs text-blue-600 hover:text-blue-500 underline'>
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </dd>
              </div>
              <div>
                <dt className='text-sm font-medium text-gray-500 dark:text-slate-400'>
                  Serial Number
                </dt>
                <dd className='mt-1'>
                  {editingSerial ? (
                    <div className='flex items-center space-x-2'>
                      <input
                        type='text'
                        value={newSerialNumber}
                        onChange={(e) => setNewSerialNumber(e.target.value)}
                        className='text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-mono'
                        placeholder='Enter serial number'
                      />
                      <button
                        onClick={updateSerialNumber}
                        disabled={updating || !newSerialNumber.trim()}
                        className='text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
                        {updating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelSerialEdit}
                        disabled={updating}
                        className='text-xs bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-300 px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed'>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className='flex items-center space-x-2'>
                      <span className='text-sm text-gray-900 dark:text-slate-100 font-mono'>
                        {sensor.serial_number}
                      </span>
                      <button
                        onClick={startSerialEdit}
                        className='text-xs text-blue-600 hover:text-blue-800'
                        title='Edit serial number'>
                        <svg
                          className='w-3 h-3'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </dd>
              </div>
              {sensor.lot_number && (
                <div>
                  <dt className='text-sm font-medium text-gray-500 dark:text-slate-400'>
                    Lot Number
                  </dt>
                  <dd className='mt-1'>
                    {editingLot ? (
                      <div className='flex items-center space-x-2'>
                        <input
                          type='text'
                          value={newLotNumber}
                          onChange={(e) => setNewLotNumber(e.target.value)}
                          className='text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-mono'
                          placeholder='Enter lot number'
                        />
                        <button
                          onClick={updateLotNumber}
                          disabled={updating}
                          className='text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelLotEdit}
                          disabled={updating}
                          className='text-xs bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-300 px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed'>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className='flex items-center space-x-2'>
                        <span className='text-sm text-gray-900 dark:text-slate-100 font-mono'>
                          {sensor.lot_number}
                        </span>
                        <button
                          onClick={startLotEdit}
                          className='text-xs text-blue-600 hover:text-blue-800'
                          title='Edit lot number'>
                          <svg
                            className='w-3 h-3'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </dd>
                </div>
              )}
              {(!(sensor as any).sensorModel || (sensor as any).sensorModel?.manufacturer !== 'Dexcom') && !sensor.lot_number && (
                <div>
                  <dt className='text-sm font-medium text-gray-500 dark:text-slate-400'>
                    Lot Number
                  </dt>
                  <dd className='mt-1 text-sm text-gray-500 dark:text-slate-400 italic'>
                    Not required for this sensor type
                  </dd>
                </div>
              )}
              <div>
                <dt className='text-sm font-medium text-gray-500 dark:text-slate-400'>
                  Date Applied
                </dt>
                <dd className='mt-1'>
                  {editingDate ? (
                    <div className='flex items-center space-x-2'>
                      <input
                        type='datetime-local'
                        value={newDateAdded}
                        onChange={(e) => setNewDateAdded(e.target.value)}
                        className='text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100'
                      />
                      <button
                        onClick={updateDateAdded}
                        disabled={updating || !newDateAdded}
                        className='text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
                        {updating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelDateEdit}
                        disabled={updating}
                        className='text-xs bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-300 px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed'>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className='flex items-center space-x-2'>
                      <span className='text-sm text-gray-900 dark:text-slate-100'>
                        {formatDate(sensor.date_added)}
                      </span>
                      <button
                        onClick={startDateEdit}
                        className='text-xs text-blue-600 hover:text-blue-800'
                        title='Edit date'>
                        <svg
                          className='w-3 h-3'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </dd>
              </div>
              <div>
                <dt className='text-sm font-medium text-gray-500 dark:text-slate-400'>
                  Status
                </dt>
                <dd className='mt-1'>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      sensor.is_problematic
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                    {sensor.is_problematic ? 'Problematic' : 'Normal'}
                  </span>
                </dd>
              </div>
            </dl>

            {sensor.issue_notes && (
              <div className='mt-6 pt-6 border-t border-gray-200'>
                <dt className='text-sm font-medium text-gray-500 mb-2'>
                  Issue Notes
                </dt>
                <dd>
                  {editingNotes ? (
                    <div className='space-y-2'>
                      <textarea
                        value={newIssueNotes}
                        onChange={(e) => setNewIssueNotes(e.target.value)}
                        className='w-full text-sm border border-gray-300 dark:border-slate-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100'
                        placeholder='Enter issue notes'
                        rows={3}
                      />
                      <div className='flex items-center space-x-2'>
                        <button
                          onClick={updateIssueNotes}
                          disabled={updating}
                          className='text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelNotesEdit}
                          disabled={updating}
                          className='text-xs bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-300 px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed'>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className='flex items-start space-x-2'>
                      <span className='text-sm text-gray-900 dark:text-slate-100 bg-red-50 dark:bg-red-900/20 p-3 rounded-md flex-1'>
                        {sensor.issue_notes}
                      </span>
                      <button
                        onClick={startNotesEdit}
                        className='text-xs text-blue-600 hover:text-blue-800 mt-3'
                        title='Edit issue notes'>
                        <svg
                          className='w-3 h-3'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </dd>
              </div>
            )}
          </div>

          {/* Photos section */}
          <div className='card'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold'>Photos</h2>
              <span className='text-sm text-gray-500'>
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {loadingPhotos ? (
              <div className='text-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
                <p className='text-sm text-gray-500 mt-2'>Loading photos...</p>
              </div>
            ) : photos.length > 0 ? (
              <PhotoGallery
                photos={photos}
                sensorId={sensorId}
                userId={user?.id || ''}
                onPhotoDeleted={(photoId) => {
                  setPhotos((prev) => prev.filter((p) => p.id !== photoId));
                }}
              />
            ) : (
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
            )}

            <div className='mt-6 pt-6 border-t border-gray-200 dark:border-slate-700'>
              <h3 className='text-sm font-medium text-gray-700 dark:text-slate-300 mb-4'>
                Add New Photo
              </h3>
              <ImageUpload
                sensorId={sensorId}
                userId={user?.id || ''}
                onUploadComplete={(path) => {
                  const newPhoto: SensorPhoto = {
                    id: crypto.randomUUID(),
                    sensor_id: sensorId,
                    file_path: Array.isArray(path) ? path[0] : path,
                    created_at: new Date().toISOString(),
                    user_id: user?.id || ''
                  };
                  setPhotos((prev) => [...prev, newPhoto]);
                }}
                onError={(error) => setError(error)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className='space-y-6'>
          <div className='card'>
            <h2 className='text-lg font-semibold mb-4'>Actions</h2>
            <div className='space-y-3'>
              <button
                onClick={toggleProblematic}
                disabled={updating}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sensor.is_problematic
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}>
                {updating ? (
                  <div className='flex items-center'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2'></div>
                    Updating...
                  </div>
                ) : (
                  <>
                    {sensor.is_problematic ? (
                      <>
                        <svg
                          className='w-4 h-4 mr-2'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M5 13l4 4L19 7'
                          />
                        </svg>
                        Mark as Normal
                      </>
                    ) : (
                      <>
                        <svg
                          className='w-4 h-4 mr-2'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                          />
                        </svg>
                        Mark as Problematic
                      </>
                    )}
                  </>
                )}
              </button>

              {sensor.is_problematic && (
                <a
                  href={
                    sensor.sensor_type === 'dexcom'
                      ? 'https://dexcom.custhelp.com/app/webform'
                      : 'https://www.freestyle.abbott/us-en/support/sensorsupportrequest.html'
                  }
                  target='_blank'
                  rel='noopener noreferrer'
                  className='w-full btn-primary text-center inline-block'>
                  Request{' '}
                  {sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Freestyle'}{' '}
                  Replacement
                </a>
              )}

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className='w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                <svg
                  className='w-4 h-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16'
                  />
                </svg>
                Delete Sensor
              </button>
            </div>
          </div>

          <div className='card'>
            <h2 className='text-lg font-semibold mb-4'>Need Help?</h2>
            <div className='space-y-3'>
              <a
                href={
                  sensor.sensor_type === 'dexcom'
                    ? 'https://dexcom.custhelp.com/app/webform'
                    : 'https://www.freestyle.abbott/us-en/support/sensorsupportrequest.html'
                }
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300'>
                <svg
                  className='w-4 h-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                Request{' '}
                {sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Freestyle'}{' '}
                Replacement
              </a>
              <a
                href={
                  sensor.sensor_type === 'dexcom'
                    ? 'https://www.dexcom.com/contact'
                    : 'https://www.freestyle.abbott/us-en/support'
                }
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300'>
                <svg
                  className='w-4 h-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                  />
                </svg>
                Contact {sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Abbott'}{' '}
                Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <div className='flex items-center mb-4'>
              <div className='flex-shrink-0'>
                <svg
                  className='h-6 w-6 text-red-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <h3 className='text-lg font-medium text-gray-900'>
                  Delete Sensor
                </h3>
              </div>
            </div>

            <div className='mb-6'>
              <p className='text-sm text-gray-500 mb-2'>
                Are you sure you want to delete this sensor?
              </p>
              <div className='bg-gray-50 p-3 rounded-md'>
                <p className='text-sm font-medium text-gray-900'>
                  Serial: {sensor.serial_number}
                </p>
                {sensor.lot_number && (
                  <p className='text-sm text-gray-600'>
                    Lot: {sensor.lot_number}
                  </p>
                )}
              </div>
              <p className='text-sm text-red-600 mt-2'>
                This action cannot be undone. All associated photos will also be
                removed.
              </p>
            </div>

            <div className='flex space-x-3'>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className='flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed'>
                Cancel
              </button>
              <button
                onClick={deleteSensor}
                disabled={deleting}
                className='flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                {deleting ? (
                  <div className='flex items-center justify-center'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                    Deleting...
                  </div>
                ) : (
                  'Delete Sensor'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
