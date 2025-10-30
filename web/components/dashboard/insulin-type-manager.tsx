'use client';

import { useState, useEffect } from 'react';
import { InsulinType, COMMON_INSULIN_TYPES } from '@/lib/insulin-service';

export function InsulinTypeManager() {
  const [insulinTypes, setInsulinTypes] = useState<InsulinType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'rapid' as 'rapid' | 'short' | 'intermediate' | 'long' | 'ultra_long' | 'premixed',
    brand: '',
    onset_minutes: '',
    peak_minutes: '',
    duration_minutes: '',
    color: '#FF6B6B'
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
      }
    } catch (error) {
      console.error('Error fetching insulin types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/insulin/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          onset_minutes: formData.onset_minutes ? parseInt(formData.onset_minutes) : null,
          peak_minutes: formData.peak_minutes ? parseInt(formData.peak_minutes) : null,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          brand: formData.brand || null
        })
      });

      if (response.ok) {
        setFormData({
          name: '',
          type: 'rapid',
          brand: '',
          onset_minutes: '',
          peak_minutes: '',
          duration_minutes: '',
          color: '#FF6B6B'
        });
        setShowForm(false);
        fetchInsulinTypes();
      } else {
        alert('Failed to create insulin type');
      }
    } catch (error) {
      console.error('Error creating insulin type:', error);
      alert('Error creating insulin type');
    } finally {
      setLoading(false);
    }
  };

  const addCommonType = async (commonType: typeof COMMON_INSULIN_TYPES[0]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/insulin/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commonType)
      });

      if (response.ok) {
        fetchInsulinTypes();
      }
    } catch (error) {
      console.error('Error adding common insulin type:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My Insulin Types</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Add Custom Type'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="rapid">Rapid-acting</option>
                <option value="short">Short-acting</option>
                <option value="intermediate">Intermediate</option>
                <option value="long">Long-acting</option>
                <option value="ultra_long">Ultra-long</option>
                <option value="premixed">Premixed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Onset (min)</label>
              <input
                type="number"
                value={formData.onset_minutes}
                onChange={(e) => setFormData({ ...formData, onset_minutes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Peak (min)</label>
              <input
                type="number"
                value={formData.peak_minutes}
                onChange={(e) => setFormData({ ...formData, peak_minutes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (min)</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-20 h-10 border rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Insulin Type'}
          </button>
        </form>
      )}

      {insulinTypes.length === 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-3">
            No insulin types configured. Add common types to get started:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {COMMON_INSULIN_TYPES.map((type) => (
              <button
                key={type.name}
                onClick={() => addCommonType(type)}
                disabled={loading}
                className="px-3 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 text-sm disabled:opacity-50"
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {insulinTypes.map((type) => (
          <div
            key={type.id}
            className="p-3 border rounded-lg flex items-center justify-between"
            style={{ borderLeftColor: type.color, borderLeftWidth: '4px' }}
          >
            <div>
              <h4 className="font-medium">{type.name}</h4>
              <p className="text-sm text-gray-600">
                {type.brand && `${type.brand} • `}
                {type.type.replace('_', '-')}
                {type.onset_minutes && ` • Onset: ${type.onset_minutes}min`}
                {type.peak_minutes && ` • Peak: ${type.peak_minutes}min`}
                {type.duration_minutes && ` • Duration: ${Math.round(type.duration_minutes / 60)}hr`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
