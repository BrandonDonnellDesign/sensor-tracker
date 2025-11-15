'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Star, Plus, Utensils, Coffee, Pizza, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { MealTemplate } from '@/types/meal-templates';

interface MealTemplateBrowserProps {
  onSelectTemplate: (template: MealTemplate) => void;
  onCreateNew: () => void;
}

const MEAL_TYPE_ICONS = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Pizza,
  snack: Cookie,
  other: Utensils
};

export function MealTemplateBrowser({ onSelectTemplate, onCreateNew }: MealTemplateBrowserProps) {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    loadTemplates();
  }, [selectedType]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedType !== 'all') {
        params.append('meal_type', selectedType);
      }

      const response = await fetch(`/api/meal-templates?${params}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
      } else {
        toast.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const mealTypes = [
    { value: 'all', label: 'All Meals' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snacks' }
  ];

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Meal Templates
        </h3>
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Meal Type Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {mealTypes.map((type) => (
          <Button
            key={type.value}
            variant={selectedType === type.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(type.value)}
            className="whitespace-nowrap"
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-8 text-center">
          <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No templates yet</p>
          <Button variant="outline" size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((template) => {
            const Icon = template.meal_type ? MEAL_TYPE_ICONS[template.meal_type] : Utensils;
            return (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4 hover:bg-slate-700/30 transition-colors text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-blue-400" />
                    <h4 className="font-medium text-white">{template.name}</h4>
                  </div>
                  {template.is_favorite && (
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  )}
                </div>

                {template.description && (
                  <p className="text-sm text-slate-400 mb-3">{template.description}</p>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="border-slate-600">
                    {template.total_carbs}g carbs
                  </Badge>
                  {template.total_calories && (
                    <span className="text-slate-400">{Math.round(template.total_calories)} cal</span>
                  )}
                  <span className="text-slate-500 ml-auto">
                    {template.items?.length || 0} items
                  </span>
                </div>

                {template.use_count > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    Used {template.use_count} times
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
