'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { Download, FileText, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportDataProps {
  className?: string;
}

export function ExportData({ className = '' }: ExportDataProps) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<30 | 90 | 365>(30);

  const exportToCSV = async () => {
    if (!user) return;

    try {
      setExporting(true);
      const supabase = createClient();
      
      // Get insulin logs for the selected period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - exportPeriod);
      
      const { data: logs, error } = await supabase
        .from('insulin_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('taken_at', startDate.toISOString())
        .order('taken_at', { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        alert('No data found for the selected period');
        return;
      }

      // Convert to CSV
      const headers = [
        'Date',
        'Time', 
        'Units',
        'Insulin Type',
        'Delivery Type',
        'Meal Relation',
        'Blood Glucose Before',
        'Injection Site',
        'Notes',
        'Logged Via'
      ];

      const csvContent = [
        headers.join(','),
        ...logs.map(log => {
          const date = new Date(log.taken_at);
          return [
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            log.units,
            log.insulin_type,
            log.delivery_type || '',
            log.meal_relation || '',
            log.blood_glucose_before || '',
            log.injection_site || '',
            `"${(log.notes || '').replace(/"/g, '""')}"`, // Escape quotes
            log.logged_via || ''
          ].join(',');
        })
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `insulin-data-${exportPeriod}days-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = async () => {
    if (!user) return;

    try {
      setExporting(true);
      const supabase = createClient();
      
      // Get insulin logs for the selected period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - exportPeriod);
      
      const { data: logs, error } = await supabase
        .from('insulin_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('taken_at', startDate.toISOString())
        .order('taken_at', { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        alert('No data found for the selected period');
        return;
      }

      // Create export object with metadata
      const exportData = {
        exportDate: new Date().toISOString(),
        period: `${exportPeriod} days`,
        totalEntries: logs.length,
        data: logs.map(log => ({
          ...log,
          user_id: undefined // Remove user_id for privacy
        }))
      };

      // Download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `insulin-data-${exportPeriod}days-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Export Data
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Download your insulin data for backup or analysis
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
          Export Period
        </label>
        <div className="flex space-x-2">
          {[30, 90, 365].map((period) => (
            <button
              key={period}
              onClick={() => setExportPeriod(period as 30 | 90 | 365)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                exportPeriod === period
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {period === 365 ? '1 Year' : `${period} Days`}
            </button>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={exportToCSV}
          disabled={exporting}
          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FileText className="h-4 w-4" />
          <span>{exporting ? 'Exporting...' : 'Export as CSV'}</span>
        </Button>

        <Button
          onClick={exportToJSON}
          disabled={exporting}
          variant="outline"
          className="flex items-center justify-center space-x-2"
        >
          <Database className="h-4 w-4" />
          <span>{exporting ? 'Exporting...' : 'Export as JSON'}</span>
        </Button>
      </div>

      <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">
          Export Information
        </h4>
        <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1">
          <li>• <strong>CSV:</strong> Compatible with Excel, Google Sheets, and most analytics tools</li>
          <li>• <strong>JSON:</strong> Structured format for developers and advanced analysis</li>
          <li>• <strong>Privacy:</strong> User IDs are removed from exported data</li>
          <li>• <strong>Backup:</strong> Use exports for data backup and portability</li>
        </ul>
      </div>
    </div>
  );
}