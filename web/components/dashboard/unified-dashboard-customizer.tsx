'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Settings, Grid, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DashboardWidget {
  id: string;
  type: 'hero' | 'stats' | 'iob-tracker' | 'quick-dose' | 'tdi' | 'basal-trends' | 'activity-timeline' | 'ai-insights' | 'gamification' | 'quick-actions' | 'glucose-chart' | 'food-summary' | 'sensor-alerts';
  title: string;
  category: 'sensors' | 'insulin' | 'food' | 'glucose' | 'general';
  enabled: boolean;
  size: 'small' | 'medium' | 'large' | 'full';
  order: number;
}

interface UnifiedDashboardCustomizerProps {
  widgets: DashboardWidget[];
  onWidgetsChange: (widgets: DashboardWidget[]) => void;
  className?: string;
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  // General/Sensors
  { id: 'hero', type: 'hero', title: 'Current Sensor Status', category: 'sensors', enabled: true, size: 'full', order: 0 },
  { id: 'stats', type: 'stats', title: 'Sensor Statistics', category: 'sensors', enabled: true, size: 'full', order: 1 },
  { id: 'sensor-alerts', type: 'sensor-alerts', title: 'Sensor Alerts', category: 'sensors', enabled: true, size: 'full', order: 2 },
  
  // Insulin
  { id: 'iob-tracker', type: 'iob-tracker', title: 'IOB Tracker', category: 'insulin', enabled: true, size: 'small', order: 3 },
  { id: 'quick-dose', type: 'quick-dose', title: 'Quick Dose Logger', category: 'insulin', enabled: false, size: 'small', order: 4 },
  { id: 'tdi', type: 'tdi', title: 'Total Daily Insulin', category: 'insulin', enabled: false, size: 'large', order: 5 },
  { id: 'basal-trends', type: 'basal-trends', title: 'Basal Trends', category: 'insulin', enabled: false, size: 'large', order: 6 },
  
  // Activity & Insights
  { id: 'ai-insights', type: 'ai-insights', title: 'AI Insights', category: 'general', enabled: true, size: 'large', order: 7 },
  { id: 'activity-timeline', type: 'activity-timeline', title: 'Activity Timeline', category: 'general', enabled: true, size: 'large', order: 8 },
  
  // Glucose
  { id: 'glucose-chart', type: 'glucose-chart', title: 'Glucose Trends', category: 'glucose', enabled: false, size: 'full', order: 9 },
  
  // Food
  { id: 'food-summary', type: 'food-summary', title: 'Recent Meals', category: 'food', enabled: false, size: 'medium', order: 10 },
  
  // Actions & Gamification
  { id: 'gamification', type: 'gamification', title: 'Achievements', category: 'general', enabled: true, size: 'small', order: 11 },
  { id: 'quick-actions', type: 'quick-actions', title: 'Quick Actions', category: 'general', enabled: true, size: 'small', order: 12 },
];

const CATEGORY_COLORS = {
  sensors: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  insulin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  food: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  glucose: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export function UnifiedDashboardCustomizer({ widgets, onWidgetsChange, className = '' }: UnifiedDashboardCustomizerProps) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setLocalWidgets(updatedItems);
  };

  const toggleWidget = (widgetId: string) => {
    const updated = localWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
    );
    setLocalWidgets(updated);
  };

  const changeWidgetSize = (widgetId: string, size: DashboardWidget['size']) => {
    const updated = localWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, size } : widget
    );
    setLocalWidgets(updated);
  };

  const saveChanges = () => {
    onWidgetsChange(localWidgets);
    setIsCustomizing(false);
    localStorage.setItem('main-dashboard-widgets', JSON.stringify(localWidgets));
  };

  const resetToDefault = () => {
    setLocalWidgets(DEFAULT_DASHBOARD_WIDGETS);
  };

  const getSizeClass = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 md:col-span-2';
      case 'large': return 'col-span-1 md:col-span-2 lg:col-span-1';
      case 'full': return 'col-span-full';
      default: return 'col-span-1';
    }
  };

  const filteredWidgets = filterCategory === 'all' 
    ? localWidgets 
    : localWidgets.filter(w => w.category === filterCategory);

  const categoryCount = (category: string) => 
    localWidgets.filter(w => w.category === category && w.enabled).length;

  if (!isCustomizing) {
    return (
      <div className={`flex justify-end ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCustomizing(true)}
          className="text-xs"
        >
          <Settings className="h-3 w-3 mr-1" />
          Customize Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
            <Grid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Customize Dashboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Drag to reorder, toggle visibility, and resize widgets
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsCustomizing(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={saveChanges}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          All ({localWidgets.filter(w => w.enabled).length})
        </button>
        <button
          onClick={() => setFilterCategory('sensors')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === 'sensors'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
          }`}
        >
          Sensors ({categoryCount('sensors')})
        </button>
        <button
          onClick={() => setFilterCategory('insulin')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === 'insulin'
              ? 'bg-purple-600 text-white'
              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
          }`}
        >
          Insulin ({categoryCount('insulin')})
        </button>
        <button
          onClick={() => setFilterCategory('glucose')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === 'glucose'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
          }`}
        >
          Glucose ({categoryCount('glucose')})
        </button>
        <button
          onClick={() => setFilterCategory('food')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === 'food'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
          }`}
        >
          Food ({categoryCount('food')})
        </button>
        <button
          onClick={() => setFilterCategory('general')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === 'general'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          General ({categoryCount('general')})
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="widgets">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3 max-h-96 overflow-y-auto"
            >
              {filteredWidgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-slate-600 ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          </div>
                          
                          <button
                            onClick={() => toggleWidget(widget.id)}
                            className="flex items-center space-x-2"
                          >
                            {widget.enabled ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-medium truncate ${
                                widget.enabled 
                                  ? 'text-gray-900 dark:text-slate-100' 
                                  : 'text-gray-500 dark:text-slate-500'
                              }`}>
                                {widget.title}
                              </h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[widget.category]}`}>
                                {widget.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-500">
                              {widget.type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <span className="text-xs text-gray-500 dark:text-slate-500 hidden sm:inline">Size:</span>
                          <div className="flex space-x-1">
                            {(['small', 'medium', 'large', 'full'] as const).map((size) => (
                              <button
                                key={size}
                                onClick={() => changeWidgetSize(widget.id, size)}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  widget.size === size
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-500'
                                }`}
                                title={size}
                              >
                                {size.charAt(0).toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Size Preview */}
                      <div className="mt-3 grid grid-cols-4 gap-1 h-8">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className={`rounded ${
                              (widget.size === 'small' && i === 0) ||
                              (widget.size === 'medium' && i < 2) ||
                              (widget.size === 'large' && i < 2) ||
                              (widget.size === 'full')
                                ? 'bg-indigo-200 dark:bg-indigo-800'
                                : 'bg-gray-200 dark:bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Layout Preview */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
          Layout Preview
        </h4>
        <div className="grid grid-cols-4 gap-2 h-32 bg-gray-100 dark:bg-slate-700 rounded-lg p-3 overflow-auto">
          {localWidgets
            .filter(w => w.enabled)
            .sort((a, b) => a.order - b.order)
            .map((widget) => (
              <div
                key={widget.id}
                className={`rounded text-xs p-1 flex items-center justify-center text-center ${
                  CATEGORY_COLORS[widget.category]
                } ${getSizeClass(widget.size)}`}
              >
                {widget.title}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
