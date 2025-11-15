'use client';

import { useEffect, useState } from 'react';
import { Trash2, Edit, X, Check } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onEdit?: () => void;
  onClear: () => void;
  isDeleting?: boolean;
  isEditing?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onDelete,
  onEdit,
  onClear,
  isDeleting = false,
  isEditing = false,
}: BulkActionsBarProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (selectedCount === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showConfirmation) {
          setShowConfirmation(false);
        } else {
          onClear();
        }
      }
      
      // Delete key to delete (with confirmation)
      if (e.key === 'Delete' && !isDeleting) {
        e.preventDefault();
        if (showConfirmation) {
          handleDelete();
        } else {
          setShowConfirmation(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCount, onClear, onDelete, isDeleting, showConfirmation]);

  const handleDelete = () => {
    setShowConfirmation(false);
    onDelete();
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 px-6 py-4">
        {showConfirmation ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              Delete {selectedCount} item{selectedCount > 1 ? 's' : ''}?
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel (Esc)
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                {selectedCount} selected
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  disabled={isEditing}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium"
                  title="Edit selected items"
                >
                  <Edit className="h-4 w-4" />
                  <span>{isEditing ? 'Editing...' : 'Edit'}</span>
                </button>
              )}
              
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={isDeleting}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors text-sm font-medium"
                title="Delete selected items (Del)"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>

              <button
                onClick={onClear}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Clear selection (Esc)"
                aria-label="Clear selection"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
