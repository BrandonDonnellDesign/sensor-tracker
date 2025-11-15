'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-client';

interface AddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SensorModel {
  id: string;
  model_name: string;
  manufacturer: string;
}

export function AddInventoryDialog({ open, onOpenChange, onSuccess }: AddInventoryDialogProps) {
  const [sensorModels, setSensorModels] = useState<SensorModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sensor_model_id: '',
    quantity: 1,
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadSensorModels();
    }
  }, [open]);

  const loadSensorModels = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sensor_models')
        .select('id, model_name, manufacturer')
        .order('manufacturer', { ascending: true });

      if (error) throw error;
      setSensorModels(data || []);
    } catch (error) {
      console.error('Error loading sensor models:', error);
      toast.error('Failed to load sensor models');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sensor_model_id) {
      toast.error('Please select a sensor model');
      return;
    }

    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Inventory added successfully');
        onSuccess();
        onOpenChange(false);
        // Reset form
        setFormData({
          sensor_model_id: '',
          quantity: 1,
          location: '',
          notes: ''
        });
      } else {
        toast.error(data.error || 'Failed to add inventory');
      }
    } catch (error) {
      console.error('Error adding inventory:', error);
      toast.error('Failed to add inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Add Sensor Inventory</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sensor_model_id" className="text-slate-300">
              Sensor Model *
            </Label>
            <select
              id="sensor_model_id"
              value={formData.sensor_model_id}
              onChange={(e) => setFormData({ ...formData, sensor_model_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a sensor model</option>
              {sensorModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.manufacturer} - {model.model_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="quantity" className="text-slate-300">
              Quantity *
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="location" className="text-slate-300">
              Location (Optional)
            </Label>
            <Input
              id="location"
              type="text"
              placeholder="e.g., Home, Office, Travel bag"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-slate-300">
              Notes (Optional)
            </Label>
            <textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-600"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Inventory'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
