'use client';

import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import Link from 'next/link';

interface SensorModel {
  id: string;
  manufacturer: string;
  model_name: string;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateSensorModel {
  manufacturer: string;
  model_name: string;
  duration_days: number;
  is_active: boolean;
}

function SensorModelsPageContent() {
  const [sensorModels, setSensorModels] = useState<SensorModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingModel, setEditingModel] = useState<SensorModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSensorModel>({
    manufacturer: '',
    model_name: '',
    duration_days: 10,
    is_active: true,
  });

  useEffect(() => {
    loadSensorModels();
  }, []);

  const loadSensorModels = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Fetch from API
      const response = await fetch('/api/admin/sensor-models');
      if (!response.ok) {
        throw new Error('Failed to fetch sensor models');
      }
      
      const data = await response.json();
      setSensorModels(data.sensorModels || []);
    } catch (err) {
      console.error('Error loading sensor models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sensor models');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = '/api/admin/sensor-models';
      const method = editingModel ? 'PUT' : 'POST';
      const body = editingModel 
        ? { ...formData, id: editingModel.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save sensor model');
      }

      await loadSensorModels();
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Error saving sensor model:', err);
      setError(err instanceof Error ? err.message : 'Failed to save sensor model');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (model: SensorModel) => {
    setEditingModel(model);
    setFormData({
      manufacturer: model.manufacturer,
      model_name: model.model_name,
      duration_days: model.duration_days,
      is_active: model.is_active,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this sensor model? This action cannot be undone.')) {
      return;
    }

    setDeleting(modelId);
    try {
      const response = await fetch(`/api/admin/sensor-models?id=${modelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sensor model');
      }

      await loadSensorModels();
      setError(null);
    } catch (err) {
      console.error('Error deleting sensor model:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete sensor model');
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setEditingModel(null);
    setFormData({
      manufacturer: '',
      model_name: '',
      duration_days: 10,
      is_active: true,
    });
    setShowAddForm(false);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
                  <Link href="/admin" className="hover:text-white transition-colors">
                    ← Back to Admin Dashboard
                  </Link>
                </div>
                <h1 className="text-3xl font-bold text-white">Sensor Models Management</h1>
                <p className="text-slate-400 mt-1">
                  Manage sensor types and manufacturers
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Model</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">Error loading sensor models</h3>
                  <div className="mt-2 text-sm text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Sensor Models Table */}
              <div className="bg-slate-800 rounded-lg border border-slate-700">
                <div className="px-6 py-4 border-b border-slate-700">
                  <h2 className="text-lg font-medium text-white">Sensor Models</h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Manufacturer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Model
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {sensorModels.map((model) => (
                        <tr key={model.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {model.manufacturer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {model.model_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {model.duration_days} days
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              model.is_active 
                                ? 'bg-green-900/30 text-green-400 border border-green-700' 
                                : 'bg-red-900/30 text-red-400 border border-red-700'
                            }`}>
                              {model.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleEdit(model)}
                                className="text-blue-400 hover:text-blue-300 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(model.id)}
                                disabled={deleting === model.id}
                                className="text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                              >
                                {deleting === model.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {sensorModels.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No sensor models configured</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Add/Edit Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
                <div className="px-6 py-4 border-b border-slate-700">
                  <h2 className="text-lg font-medium text-white">
                    {editingModel ? 'Edit Sensor Model' : 'Add New Sensor Model'}
                  </h2>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label htmlFor="manufacturer" className="block text-sm font-medium text-slate-300 mb-2">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="e.g., Dexcom, Abbott, Medtronic"
                    />
                  </div>

                  <div>
                    <label htmlFor="model_name" className="block text-sm font-medium text-slate-300 mb-2">
                      Model Name
                    </label>
                    <input
                      type="text"
                      id="model_name"
                      value={formData.model_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="e.g., G7, FreeStyle Libre 3"
                    />
                  </div>

                  <div>
                    <label htmlFor="duration_days" className="block text-sm font-medium text-slate-300 mb-2">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      id="duration_days"
                      min="1"
                      max="30"
                      value={formData.duration_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="is_active" className="block text-sm font-medium text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      id="is_active"
                      value={formData.is_active.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : (editingModel ? 'Update Model' : 'Create Model')}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}

export default function SensorModelsPage() {
  return <SensorModelsPageContent />;
}
