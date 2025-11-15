'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { BulkActionsBar } from '@/components/ui/bulk-actions-bar';
import { UndoToast } from '@/components/ui/undo-toast';
import { createClient } from '@/lib/supabase-client';
import { format } from 'date-fns';

interface InsulinLog {
  id: string;
  insulin_type: string;
  insulin_name: string | null;
  units: number;
  delivery_type: string;
  taken_at: string;
  notes?: string | null;
  blood_glucose_before?: number | null;
}

export function EnhancedDoseHistory() {
  const [logs, setLogs] = useState<InsulinLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InsulinLog[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUndo, setShowUndo] = useState(false);
  const [deletedLogs, setDeletedLogs] = useState<InsulinLog[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, filterType, dateRange]);

  const loadLogs = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('insulin_logs')
        .select('*')
        .order('taken_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.insulin_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.units.toString().includes(searchQuery)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.delivery_type === filterType);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(log => new Date(log.taken_at) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(log => new Date(log.taken_at) <= new Date(dateRange.end));
    }

    setFilteredLogs(filtered);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredLogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLogs.map(log => log.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected entries?`)) return;

    const logsToDelete = logs.filter(log => selectedIds.has(log.id));
    setDeletedLogs(logsToDelete);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('insulin_logs')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      setLogs(logs.filter(log => !selectedIds.has(log.id)));
      setSelectedIds(new Set());
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
    } catch (error) {
      console.error('Error deleting logs:', error);
      alert('Failed to delete entries');
    }
  };

  const handleUndo = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('insulin_logs')
        .insert(deletedLogs as any);

      if (error) throw error;

      setLogs([...deletedLogs, ...logs]);
      setDeletedLogs([]);
      setShowUndo(false);
    } catch (error) {
      console.error('Error restoring logs:', error);
      alert('Failed to restore entries');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search doses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value="all">All Types</option>
              <option value="bolus">Bolus</option>
              <option value="basal">Basal</option>
              <option value="correction">Correction</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
          <span>
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
          {(searchQuery || filterType !== 'all' || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setDateRange({ start: '', end: '' });
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Select All */}
      {filteredLogs.length > 0 && (
        <div className="flex items-center space-x-2 px-4">
          <input
            type="checkbox"
            checked={selectedIds.size === filteredLogs.length && filteredLogs.length > 0}
            onChange={selectAll}
            className="rounded"
          />
          <span className="text-sm text-gray-600 dark:text-slate-400">
            Select all {filteredLogs.length} entries
          </span>
        </div>
      )}

      {/* Dose List */}
      <div className="space-y-2">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`bg-white dark:bg-slate-800 rounded-lg border p-4 transition-all ${
              selectedIds.has(log.id)
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start space-x-4">
              <input
                type="checkbox"
                checked={selectedIds.has(log.id)}
                onChange={() => toggleSelect(log.id)}
                className="mt-1 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {log.units}u
                    </span>
                    <span className="text-sm text-gray-600 dark:text-slate-400">
                      {log.insulin_name || log.insulin_type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.delivery_type === 'bolus'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {log.delivery_type}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-500">
                    {format(new Date(log.taken_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                {log.blood_glucose_before && (
                  <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                    BG: {log.blood_glucose_before} mg/dL
                  </div>
                )}
                {log.notes && (
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    {log.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-slate-400">
          No entries found matching your filters
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* Undo Toast */}
      {showUndo && (
        <UndoToast
          message={`Deleted ${deletedLogs.length} entries`}
          onUndo={handleUndo}
        />
      )}
    </div>
  );
}
