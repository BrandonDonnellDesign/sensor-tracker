'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Settings, Grid, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardWidget {
  id: string;
  type: 'tdi' | 'basal-trends' | 'iob-decay' | 'iob-tracker' | 'quick-dose' | 'calculator' | 'stats' | 'export';
  title: string;
  enabled: boolean;
  size: 'small' | 'medium' | 'large' | 'full';
  order: number;
}

interface DashboardCustomizerProps {
  widgets: DashboardWidget[];
  onWidgetsChange: (widgets: DashboardWidget[]) => void;
  className?: string;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'iob-tracker', type: 'iob-tracker', title: 'IOB Tracker', enabled: true, size: 'small', order: 0 },
  { id: 'quick-dose', type: 'quick-dose', title: 'Quick Dose Logger', enabled: true, size: 'small', order: 1 },
  { id: 'calculator', type: 'calculator', title: 'Insulin Calculator', enabled: true, size: 'small', order: 2 },
  { id: 'tdi', type: 'tdi', title: 'TDI Dashboard', enabled: true, size: 'large', order: 3 },
  { id: 'basal-trends', type: 'basal-trends', title: 'Basal Trends', enabled: true, size: 'large', order: 4 },
  { id: 'iob-decay', type: 'iob-decay', title: 'IOB Decay Chart', enabled: true, size: 'full', order: 5 },
  { id: 'stats', type: 'stats', title: 'Statistics Cards', enabled: true, size: 'full', order: 6 },
  { id: 'export', type: 'export', title: 'Export Data', enabled: true, size: 'medium', order: 7 },
];

export function DashboardCustomizer({ widgets, onWidgetsChange, className = '' }: DashboardCustomizerProps) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets);

  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
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
    
    // Save to localStorage for persistence
    localStorage.setItem('insulin-dashboard-widgets', JSON.stringify(localWidgets));
  };

  const resetToDefault = () => {
    setLocalWidgets(DEFAULT_WIDGETS);
  };

  const getSizeClass = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-2';
      case 'large': return 'col-span-2 lg:col-span-1';
      case 'full': return 'col-span-full';
      default: return 'col-span-1';
    }
  };

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="widgets">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {localWidgets.map((widget, index) => (
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
                        <div className="flex items-center space-x-3">
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
                          
                          <div>
                            <h4 className={`font-medium ${
                              widget.enabled 
                                ? 'text-gray-900 dark:text-slate-100' 
                                : 'text-gray-500 dark:text-slate-500'
                            }`}>
                              {widget.title}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-slate-500">
                              {widget.type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-slate-500">Size:</span>
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

      {/* Preview */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
          Layout Preview
        </h4>
        <div className="grid grid-cols-4 gap-2 h-32 bg-gray-100 dark:bg-slate-700 rounded-lg p-3">
          {localWidgets
            .filter(w => w.enabled)
            .sort((a, b) => a.order - b.order)
            .map((widget) => (
              <div
                key={widget.id}
                className={`bg-indigo-200 dark:bg-indigo-800 rounded text-xs p-1 flex items-center justify-center text-indigo-800 dark:text-indigo-200 ${getSizeClass(widget.size)}`}
              >
                {widget.title}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}