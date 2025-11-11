'use client';

import { useState } from 'react';
import { Trash2, Download, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InsulinLog {
  id: string;
  units: number;
  insulin_type: string;
  taken_at: string;
  notes?: string | null;
  delivery_type?: string;
}

interface BulkOperationsProps {
  logs: InsulinLog[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkExport: (ids: string[]) => void;
  className?: string;
}

export function BulkOperations({ 
  logs, 
  selectedIds, 
  onSelectionChange, 
  onBulkDelete, 
  onBulkExport,
  className = '' 
}: BulkOperationsProps) {
  const [showBulkMode, setShowBulkMode] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.size === logs.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(logs.map(log => log.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0 && confirm(`Delete ${selectedIds.size} selected entries?`)) {
      onBulkDelete(Array.from(selectedIds));
      onSelectionChange(new Set());
      setShowBulkMode(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.size > 0) {
      onBulkExport(Array.from(selectedIds));
    }
  };

  if (!showBulkMode && selectedIds.size === 0) {
    return (
      <div className={`flex justify-end ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBulkMode(true)}
          className="text-xs"
        >
          <CheckSquare className="h-3 w-3 mr-1" />
          Bulk Select
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-3 border border-gray-200 dark:border-slate-600 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center space-x-2 text-sm text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100"
          >
            {selectedIds.size === logs.length ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>
              {selectedIds.size === 0 
                ? 'Select All' 
                : selectedIds.size === logs.length 
                ? 'Deselect All'
                : `${selectedIds.size} selected`
              }
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Export ({selectedIds.size})
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete ({selectedIds.size})
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowBulkMode(false);
              onSelectionChange(new Set());
            }}
            className="text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Selection Helper */}
      {showBulkMode && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
          <p className="text-xs text-gray-600 dark:text-slate-400">
            💡 Click on dose entries to select them for bulk operations
          </p>
        </div>
      )}
    </div>
  );
}