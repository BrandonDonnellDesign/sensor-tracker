'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialItems?: Array<{
    product_name: string;
    carbs_g: number;
    calories?: number;
    protein_g?: number;
    fat_g?: number;
  }>;
}

export function CreateTemplateDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  initialItems = []
}: CreateTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    meal_type: 'other' as 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
  });
  const [items, setItems] = useState(
    initialItems.length > 0 
      ? initialItems 
      : [{ product_name: '', carbs_g: 0, calories: 0, protein_g: 0, fat_g: 0 }]
  );

  const addItem = () => {
    setItems([...items, { product_name: '', carbs_g: 0, calories: 0, protein_g: 0, fat_g: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const validItems = items.filter(item => item.product_name.trim() && item.carbs_g > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one food item');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/meal-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: validItems
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Template created successfully');
        onSuccess();
        onOpenChange(false);
        // Reset form
        setFormData({ name: '', description: '', meal_type: 'other' });
        setItems([{ product_name: '', carbs_g: 0, calories: 0, protein_g: 0, fat_g: 0 }]);
      } else {
        toast.error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Meal Template</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-300">
              Template Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g., My Breakfast, Chicken Salad"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="meal_type" className="text-slate-300">
              Meal Type
            </Label>
            <select
              id="meal_type"
              value={formData.meal_type}
              onChange={(e) => setFormData({ ...formData, meal_type: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-300">
              Description (Optional)
            </Label>
            <Input
              id="description"
              placeholder="Add notes about this meal..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-slate-300">Food Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Input
                      placeholder="Food name"
                      value={item.product_name}
                      onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white flex-1"
                    />
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder="Carbs (g)"
                        value={item.carbs_g || ''}
                        onChange={(e) => updateItem(index, 'carbs_g', parseFloat(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Cal"
                        value={item.calories || ''}
                        onChange={(e) => updateItem(index, 'calories', parseFloat(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Protein (g)"
                        value={item.protein_g || ''}
                        onChange={(e) => updateItem(index, 'protein_g', parseFloat(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Fat (g)"
                        value={item.fat_g || ''}
                        onChange={(e) => updateItem(index, 'fat_g', parseFloat(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              {loading ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
