'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Database } from '@/lib/database.types';
import ImageUpload from '@/components/sensors/image-upload';
import MasonryPhotoGallery from '@/components/sensors/masonry-photo-gallery';
import { TagSelector } from '@/components/sensors/tag-selector';
import { TagDisplay } from '@/components/sensors/tag-display';

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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tags, setTags] = useState<any[]>([]);

  const fetchSensor = useCallback(async () => {
    if (!user?.id || !sensorId) return;

    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from('sensors')
        .select(`
          *,
          sensorModel:sensor_models(*)
        `)
        .eq('id', sensorId)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
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
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sensor_photos')
        .select('*')
        .eq('sensor_id', sensorId)
        .eq('user_id', user.id);

      if (error) throw error;
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  }, [user?.id, sensorId]);

  const fetchTags = useCallback(async () => {
    if (!user?.id || !sensorId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sensor_tags')
        .select(`
          tag_id,
          tags (
            id,
            name,
            color,
            category,
            description
          )
        `)
        .eq('sensor_id', sensorId);

      if (error) throw error;
      setSelectedTagIds(data?.map(st => st.tag_id) || []);
      setTags(data?.map(st => st.tags).filter(Boolean) || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, [user?.id, sensorId]);

  const saveTags = async () => {
    if (!user?.id || !sensorId) return;

    setSavingTags(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('sensor_tags')
        .delete()
        .eq('sensor_id', sensorId);

      if (deleteError) throw deleteError;

      if (selectedTagIds.length > 0) {
        const { error: insertError } = await supabase
          .from('sensor_tags')
          .insert(
            selectedTagIds.map(tagId => ({
              sensor_id: sensorId,
              tag_id: tagId
            }))
          );

        if (insertError) throw insertError;
      }

      await fetchTags();
      setEditingTags(false);
    } catch (error) {
      console.error('Error saving tags:', error);
      setError(error instanceof Error ? error.message : 'Failed to save tags');
    } finally {
      setSavingTags(false);
    }
  };

  const cancelTagsEdit = () => {
    fetchTags();
    setEditingTags(false);
  };

  useEffect(() => {
    fetchSensor();
    fetchPhotos();
    fetchTags();
  }, [fetchSensor, fetchPhotos, fetchTags]);

  useEffect(() => {
    const fetchSensorModels = async () => {
      const supabase = createClient();
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
    if (!sensor || !user?.id) return;

    setUpdating(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sensors')
        .update({
          is_problematic: !sensor.is_problematic,
          issue_notes: !sensor.is_problematic ? 'Marked as problematic' : null,
        })
        .eq('id', sensor.id)
        .eq('user_id', user.id);

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

  const updateSensorModel = async () => {
    if (!sensor || !user?.id || !newSensorModelId) return;

    setUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('sensors')
        .update({ sensor_model_id: newSensorModelId })
        .eq('id', sensor.id)
        .eq('user_id', user.id);

      if (error) throw error;

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

  const startSensorModelEdit = () => {
    if (sensor) {
      const currentModelId = (sensor as any).sensor_model_id || '';
      setNewSensorModelId(currentModelId);
      setEditingSensorModel(true);
    }
  };

  const updateSerialNumber = async () => {
    if (!sensor || !user?.id || !newSerialNumber.trim()) return;

    setUpdating(true);
    try {
      const supabase = createClient();
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
      const supabase = createClient();
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

  const updateDateAdded = async () => {
    if (!sensor || !user?.id || !newDateAdded) return;

    setUpdating(true);
    try {
      const supabase = createClient();
      const localDateTime = new Date(newDateAdded + ':00');
      const isoString = localDateTime.toISOString();

      const { error } = await supabase
        .from('sensors')
        .update({ date_added: isoString })
        .eq('id', sensor.id)
        .eq('user_id', user.id);

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

  const updateIssueNotes = async () => {
    if (!sensor || !user?.id) return;

    setUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sensors')
        .update({ 
          issue_notes: newIssueNotes.trim() || null,
          is_problematic: newIssueNotes.trim() ? true : sensor.is_problematic
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

  const deleteSensor = async () => {
    if (!sensor || !user?.id) return;

    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sensors')
        .update({ is_deleted: true })
        .eq('id', sensor.id)
        .eq('user_id', user.id);

      if (error) throw error;

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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateForInput = (dateString: string) => {
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
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'>
      {/* Hero Section */}
      <div className='relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50'>
        <div className='absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:to-indigo-400/5'></div>
        <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <Link
            href='/dashboard/sensors'
            className='inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-medium mb-6 transition-all duration-200 hover:translate-x-1'>
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
          
          <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6'>
            <div className='flex-1'>
              <div className='flex items-center gap-4 mb-3'>
                <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg'>
                  <svg className='w-6 h-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' />
                  </svg>
                </div>
                <div>
                  <h1 className='text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent'>
                    {sensor.serial_number}
                  </h1>
                  <p className='text-lg text-slate-600 dark:text-slate-400 mt-1'>
                    {(sensor as any).sensorModel
                      ? `${(sensor as any).sensorModel.manufacturer} ${(sensor as any).sensorModel.model_name}`
                      : sensor.sensor_type === 'dexcom' ? 'Dexcom G6/G7' : 'Abbott FreeStyle Libre'
                    }
                  </p>
                </div>
              </div>
              <p className='text-slate-500 dark:text-slate-400'>
                Sensor Details & Management • Added {formatDate(sensor.date_added)}
              </p>
            </div>
            
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm'>
                <div
                  className={`w-3 h-3 rounded-full shadow-sm ${
                    sensor.is_problematic 
                      ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-red-200 dark:shadow-red-900' 
                      : 'bg-gradient-to-r from-green-400 to-green-500 shadow-green-200 dark:shadow-green-900'
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    sensor.is_problematic
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                  {sensor.is_problematic ? 'Problematic' : 'Normal'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Sensor Information Card */}
            <div className='bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-slate-900/20 overflow-hidden'>
              <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50'>
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center'>
                    <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                  </div>
                  <h2 className='text-xl font-bold text-slate-900 dark:text-slate-100'>Sensor Information</h2>
                </div>
              </div>
              <div className='p-6'>
                <dl className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                  <div className='bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50'>
                    <dt className='text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2'>
                      <svg className='w-4 h-4 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' />
                      </svg>
                      Sensor Model
                    </dt>
                    <dd>
                      {editingSensorModel ? (
                        <div className='flex items-center space-x-2'>
                          <select
                            value={newSensorModelId}
                            onChange={(e) => setNewSensorModelId(e.target.value)}
                            className='flex-1 text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100'>
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
                            className='px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xs font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                            {updating ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelSensorModelEdit}
                            disabled={updating}
                            className='px-3 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className='flex items-center justify-between'>
                          <span className='inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30'>
                            {(sensor as any).sensorModel
                              ? `${(sensor as any).sensorModel.manufacturer} ${(sensor as any).sensorModel.model_name}`
                              : sensor.sensor_type === 'dexcom' ? 'Dexcom G6' : 'Abbott FreeStyle Libre'
                            }
                          </span>
                          {sensorModels.length > 0 && (
                            <button
                              onClick={startSensorModelEdit}
                              className='p-2 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200'
                              title='Edit sensor model'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </dd>
                  </div>
                  
                  <div className='bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50'>
                    <dt className='text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2'>
                      <svg className='w-4 h-4 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 20l4-16m2 16l4-16M6 9h14M4 15h14' />
                      </svg>
                      Serial Number
                    </dt>
                    <dd>
                      {editingSerial ? (
                        <div className='flex items-center space-x-2'>
                          <input
                            type='text'
                            value={newSerialNumber}
                            onChange={(e) => setNewSerialNumber(e.target.value)}
                            className='flex-1 text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono'
                            placeholder='Enter serial number'
                          />
                          <button
                            onClick={updateSerialNumber}
                            disabled={updating || !newSerialNumber.trim()}
                            className='px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xs font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                            {updating ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelSerialEdit}
                            disabled={updating}
                            className='px-3 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className='flex items-center justify-between'>
                          <span className='text-lg font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-600 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-500'>
                            {sensor.serial_number}
                          </span>
                          <button
                            onClick={startSerialEdit}
                            className='p-2 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200'
                            title='Edit serial number'>
                            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                            </svg>
                          </button>
                        </div>
                      )}
                    </dd>
                  </div>

                  {sensor.lot_number && (
                    <div className='bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50'>
                      <dt className='text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2'>
                        <svg className='w-4 h-4 text-purple-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' />
                        </svg>
                        Lot Number
                      </dt>
                      <dd>
                        {editingLot ? (
                          <div className='flex items-center space-x-2'>
                            <input
                              type='text'
                              value={newLotNumber}
                              onChange={(e) => setNewLotNumber(e.target.value)}
                              className='flex-1 text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono'
                              placeholder='Enter lot number'
                            />
                            <button
                              onClick={updateLotNumber}
                              disabled={updating}
                              className='px-3 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl text-xs font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                              {updating ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelLotEdit}
                              disabled={updating}
                              className='px-3 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className='flex items-center justify-between'>
                            <span className='text-lg font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-600 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-500'>
                              {sensor.lot_number}
                            </span>
                            <button
                              onClick={startLotEdit}
                              className='p-2 text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200'
                              title='Edit lot number'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                              </svg>
                            </button>
                          </div>
                        )}
                      </dd>
                    </div>
                  )}

                  {(!(sensor as any).sensorModel || (sensor as any).sensorModel?.manufacturer !== 'Dexcom') && !sensor.lot_number && (
                    <div className='bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50'>
                      <dt className='text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2'>
                        <svg className='w-4 h-4 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' />
                        </svg>
                        Lot Number
                      </dt>
                      <dd className='text-sm text-slate-500 dark:text-slate-400 italic'>
                        Not required for this sensor type
                      </dd>
                    </div>
                  )}

                  <div className='bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50 sm:col-span-2'>
                    <dt className='text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2'>
                      <svg className='w-4 h-4 text-indigo-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                      </svg>
                      Date Applied
                    </dt>
                    <dd>
                      {editingDate ? (
                        <div className='flex items-center space-x-2'>
                          <input
                            type='datetime-local'
                            value={newDateAdded}
                            onChange={(e) => setNewDateAdded(e.target.value)}
                            className='flex-1 text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                          />
                          <button
                            onClick={updateDateAdded}
                            disabled={updating || !newDateAdded}
                            className='px-3 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl text-xs font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                            {updating ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelDateEdit}
                            disabled={updating}
                            className='px-3 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className='flex items-center justify-between'>
                          <span className='text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-600 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-500'>
                            {formatDate(sensor.date_added)}
                          </span>
                          <button
                            onClick={startDateEdit}
                            className='p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all duration-200'
                            title='Edit date'>
                            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                            </svg>
                          </button>
                        </div>
                      )}
                    </dd>
                  </div>

                  <div className='bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50'>
                    <dt className='text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2'>
                      <svg className='w-4 h-4 text-emerald-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                      Status
                    </dt>
                    <dd>
                      <span
                        className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold ${
                          sensor.is_problematic
                            ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30'
                        }`}>
                        {sensor.is_problematic ? 'Problematic' : 'Normal'}
                      </span>
                    </dd>
                  </div>
                </dl>

                {/* Issue Notes Section */}
                {sensor.issue_notes && (
                  <div className='mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-700/50'>
                    <div className='flex items-center justify-between mb-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-6 h-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center'>
                          <svg className='w-3 h-3 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z' />
                          </svg>
                        </div>
                        <h3 className='text-lg font-bold text-slate-900 dark:text-slate-100'>Issue Notes</h3>
                      </div>
                      <button
                        onClick={startNotesEdit}
                        className='p-2 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200'
                        title='Edit issue notes'>
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                        </svg>
                      </button>
                    </div>

                    {editingNotes ? (
                      <div className='space-y-4'>
                        <textarea
                          value={newIssueNotes}
                          onChange={(e) => setNewIssueNotes(e.target.value)}
                          className='w-full text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                          placeholder='Enter issue notes'
                          rows={4}
                        />
                        <div className='flex items-center space-x-3'>
                          <button
                            onClick={updateIssueNotes}
                            disabled={updating}
                            className='px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                            {updating ? 'Saving...' : 'Save Notes'}
                          </button>
                          <button
                            onClick={cancelNotesEdit}
                            disabled={updating}
                            className='px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className='bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-2xl p-4'>
                        <p className='text-sm text-slate-900 dark:text-slate-100 leading-relaxed'>
                          {sensor.issue_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Section */}
                <div className='mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-700/50'>
                  <div className='flex items-center justify-between mb-6'>
                    <div className='flex items-center gap-3'>
                      <div className='w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center'>
                        <svg className='w-3 h-3 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' />
                        </svg>
                      </div>
                      <h3 className='text-lg font-bold text-slate-900 dark:text-slate-100'>Tags</h3>
                    </div>
                    {!editingTags && (
                      <button
                        onClick={() => setEditingTags(true)}
                        className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium'
                        title='Edit tags'>
                        Edit Tags
                      </button>
                    )}
                  </div>

                  {editingTags ? (
                    <div>
                      <TagSelector
                        selectedTagIds={selectedTagIds}
                        onTagsChange={setSelectedTagIds}
                        className="mb-4"
                      />
                      <div className='flex items-center space-x-3'>
                        <button
                          onClick={saveTags}
                          disabled={savingTags}
                          className='px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                          {savingTags ? 'Saving...' : 'Save Tags'}
                        </button>
                        <button
                          onClick={cancelTagsEdit}
                          disabled={savingTags}
                          className='px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {tags.length > 0 ? (
                        <TagDisplay tags={tags} size="md" />
                      ) : (
                        <p className='text-sm text-slate-500 dark:text-slate-400 italic bg-slate-50/50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-200/50 dark:border-slate-600/50'>
                          No tags added yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photos Section */}
            <div className='bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-slate-900/20 overflow-hidden'>
              <div className='bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center'>
                      <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' />
                      </svg>
                    </div>
                    <h2 className='text-xl font-bold text-slate-900 dark:text-slate-100'>Photo Gallery</h2>
                  </div>
                  <span className='px-3 py-1.5 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-600/50'>
                    {photos.length} photo{photos.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className='p-6'>
                {loadingPhotos ? (
                  <div className='text-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
                    <p className='text-sm text-gray-500 mt-2'>Loading photos...</p>
                  </div>
                ) : photos.length > 0 ? (
                  <MasonryPhotoGallery
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

                <div className='mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-700/50'>
                  <div className='flex items-center gap-3 mb-6'>
                    <div className='w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center'>
                      <svg className='w-3 h-3 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                      </svg>
                    </div>
                    <h3 className='text-lg font-bold text-slate-900 dark:text-slate-100'>
                      Add New Photo
                    </h3>
                  </div>
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
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Quick Actions */}
            <div className='bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-slate-900/20 overflow-hidden'>
              <div className='bg-gradient-to-r from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-700 px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50'>
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center'>
                    <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
                    </svg>
                  </div>
                  <h2 className='text-lg font-bold text-slate-900 dark:text-slate-100'>Quick Actions</h2>
                </div>
              </div>
              <div className='p-6 space-y-4'>
                <button
                  onClick={toggleProblematic}
                  disabled={updating}
                  className={`w-full flex items-center justify-center px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-lg ${
                    sensor.is_problematic
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200 dark:shadow-green-900/30 hover:shadow-green-300 dark:hover:shadow-green-900/50'
                      : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200 dark:shadow-red-900/30 hover:shadow-red-300 dark:hover:shadow-red-900/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}>
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
                    className='w-full flex items-center justify-center px-6 py-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30 hover:shadow-blue-300 dark:hover:shadow-blue-900/50 transition-all duration-200 transform hover:scale-105'>
                    Request{' '}
                    {sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Freestyle'}{' '}
                    Replacement
                  </a>
                )}

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className='w-full flex items-center justify-center px-6 py-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-200 dark:shadow-slate-900/30 hover:shadow-slate-300 dark:hover:shadow-slate-900/50 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'>
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

            {/* Help & Support */}
            <div className='bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-slate-900/20 overflow-hidden'>
              <div className='bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50'>
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center'>
                    <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                  </div>
                  <h2 className='text-lg font-bold text-slate-900 dark:text-slate-100'>Need Help?</h2>
                </div>
              </div>
              <div className='p-6 space-y-4'>
                <a
                  href={
                    sensor.sensor_type === 'dexcom'
                      ? 'https://dexcom.custhelp.com/app/webform'
                      : 'https://www.freestyle.abbott/us-en/support/sensorsupportrequest.html'
                  }
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-3 p-4 bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl border border-slate-200/50 dark:border-slate-600/50 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:bg-slate-100/50 dark:hover:bg-slate-600/30 transition-all duration-200'>
                  <svg
                    className='w-4 h-4'
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
                  className='flex items-center gap-3 p-4 bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl border border-slate-200/50 dark:border-slate-600/50 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:bg-slate-100/50 dark:hover:bg-slate-600/30 transition-all duration-200'>
                  <svg
                    className='w-4 h-4'
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
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-3xl max-w-md w-full p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-2xl'>
            <div className='flex items-center gap-4 mb-6'>
              <div className='w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg'>
                <svg
                  className='h-6 w-6 text-white'
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
              <div>
                <h3 className='text-xl font-bold text-slate-900 dark:text-slate-100'>
                  Delete Sensor
                </h3>
                <p className='text-sm text-slate-500 dark:text-slate-400 mt-1'>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className='mb-8'>
              <p className='text-slate-600 dark:text-slate-400 mb-4'>
                Are you sure you want to delete this sensor? All associated photos will also be removed.
              </p>
              <div className='bg-slate-50/50 dark:bg-slate-700/30 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-600/50'>
                <p className='text-sm font-bold text-slate-900 dark:text-slate-100 mb-1'>
                  Serial: {sensor.serial_number}
                </p>
                {sensor.lot_number && (
                  <p className='text-sm text-slate-600 dark:text-slate-400'>
                    Lot: {sensor.lot_number}
                  </p>
                )}
              </div>
            </div>

            <div className='flex gap-4'>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className='flex-1 px-6 py-3 rounded-2xl text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
                Cancel
              </button>
              <button
                onClick={deleteSensor}
                disabled={deleting}
                className='flex-1 px-6 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 hover:shadow-red-300 dark:hover:shadow-red-900/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'>
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