import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'];

interface SensorCardProps {
  sensor: Sensor;
  onUpdate: () => void;
}

export function SensorCard({ sensor, onUpdate }: SensorCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this sensor?')) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('sensors')
        .update({ is_deleted: true })
        .eq('id', sensor.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error deleting sensor:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${sensor.is_problematic ? 'bg-red-400' : 'bg-green-400'}`} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{sensor.serial_number}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                sensor.sensor_type === 'dexcom' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
              }`}>
                {sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Freestyle'}
              </span>
            </div>
            {sensor.lot_number && (
              <p className="text-sm text-gray-500 dark:text-slate-400">Lot: {sensor.lot_number}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {sensor.is_problematic && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Problematic
            </span>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Date Added:</span>
          <span>{format(new Date(sensor.date_added), 'MMM d, yyyy h:mm a')}</span>
        </div>
        
        {sensor.is_problematic && sensor.issue_notes && (
          <div>
            <span className="font-medium">Issue Notes:</span>
            <p className="mt-1 text-gray-700 text-sm">{sensor.issue_notes}</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Added {format(new Date(sensor.created_at), 'MMM d, yyyy')}</span>
          {sensor.updated_at !== sensor.created_at && (
            <span>Updated {format(new Date(sensor.updated_at), 'MMM d, yyyy')}</span>
          )}
        </div>
      </div>
    </div>
  );
}