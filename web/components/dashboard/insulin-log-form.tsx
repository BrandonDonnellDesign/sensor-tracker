'use client';

import { useState, useEffect } from 'react';
import { InsulinType } from '@/lib/insulin-service';

interface InsulinLogFormProps {
  onSuccess?: () => void;
}

export function InsulinLogForm({ onSuccess }: InsulinLogFormProps) {
  const [insulinTypes, setInsulinTypes] = useState<InsulinType[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    insulin_type_id: '',
    units: '',
    dose_type: 'bolus' as 'bolus' | 'basal' | 'correction' | 'mixed',
    injection_site: '' as '' | 'abdomen' | 'arm' | 'thigh' | 'buttocks' | 'other',
    dosed_at: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  useEffect(() => {
    fetchInsulinTypes();
  }, []);

  const fetchInsulinTypes = async () => {
    try {
      const response = await fetch('/api/insulin/types');
      if (response.ok) {
        const data = await response.json();
        setInsulinTypes(data);
        if (data.length > 0 && !formData.insulin_type_id) {
          setFormData(prev => ({ ...prev, insulin_type_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching insulin types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/insulin/doses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          units: parseFloat(formData.units),
          injection_site: formData.injection_site || undefined
        })
      });

      if (response.ok) {
        setFormData({
          insulin_type_id: insulinTypes[0]?.id || '',
          units: '',
          dose_type: 'bolus',
          injection_site: '',
          dosed_at: new Date().toISOString().slice(0, 16),
          notes: ''
        });
        onSuccess?.();
      } else {
        alert('Failed to log insulin dose');
      }
    } catch (error) {
      console.error('Error logging insulin:', error);
      alert('Error logging insulin dose');
    } finally {
      setLoading(false);
    }
  };

  if (insulinTypes.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          No insulin types configured. Please add an insulin type first.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Insulin Type</label>
        <select
          value={formData.insulin_type_id}
          onChange={(e) => setFormData({ ...formData, insulin_type_id: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          required
        >
          {insulinTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} {type.brand && `(${type.brand})`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Units</label>
        <input
          type="number"
          step="0.5"
          min="0"
          value={formData.units}
          onChange={(e) => setFormData({ ...formData, units: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="5.0"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Dose Type</label>
        <select
          value={formData.dose_type}
          onChange={(e) => setFormData({ ...formData, dose_type: e.target.value as any })}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="bolus">Bolus (Meal)</option>
          <option value="correction">Correction</option>
          <option value="basal">Basal</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Injection Site (Optional)</label>
        <select
          value={formData.injection_site}
          onChange={(e) => setFormData({ ...formData, injection_site: e.target.value as any })}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="">Not specified</option>
          <option value="abdomen">Abdomen</option>
          <option value="arm">Arm</option>
          <option value="thigh">Thigh</option>
          <option value="buttocks">Buttocks</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Time</label>
        <input
          type="datetime-local"
          value={formData.dosed_at}
          onChange={(e) => setFormData({ ...formData, dosed_at: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          rows={2}
          placeholder="Any additional notes..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Logging...' : 'Log Insulin Dose'}
      </button>
    </form>
  );
}
