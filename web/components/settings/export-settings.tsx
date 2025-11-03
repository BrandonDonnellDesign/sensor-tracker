'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useDateTimeFormatter } from '@/utils/date-formatter';

interface ExportSettingsProps {
  userId?: string;
}

export function ExportSettings({ userId }: ExportSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dateFormatter = useDateTimeFormatter();

  const exportData = async (format: 'csv' | 'pdf') => {
    if (!userId) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      // Fetch sensor data
      const { data: sensors, error } = await supabase
        .from('sensors')
        .select(`
          *,
          sensor_models (
            manufacturer,
            model_name,
            duration_days
          )
        `)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('date_added', { ascending: false });

      if (error) throw error;

      if (format === 'csv') {
        await exportToCSV(sensors || []);
      } else {
        await exportToPDF(sensors || []);
      }

      setMessage({ type: 'success', text: `Data exported successfully as ${format.toUpperCase()}` });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const exportToCSV = async (sensors: any[]) => {
    const headers = [
      'Serial Number',
      'Manufacturer',
      'Model',
      'Lot Number',
      'Date Added',
      'Expiration Date',
      'Status',
      'Problematic',
      'Notes'
    ];

    const csvData = sensors.map(sensor => {
      const expirationDate = new Date(sensor.date_added);
      const durationDays = sensor.sensor_models?.duration_days || 10;
      expirationDate.setDate(expirationDate.getDate() + durationDays);
      
      const isExpired = expirationDate < new Date();
      
      return [
        sensor.serial_number || '',
        sensor.sensor_models?.manufacturer || '',
        sensor.sensor_models?.model_name || '',
        sensor.lot_number || '',
        dateFormatter.formatDate(sensor.date_added),
        dateFormatter.formatDate(expirationDate),
        isExpired ? 'Expired' : 'Active',
        sensor.is_problematic ? 'Yes' : 'No',
        sensor.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sensor-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async (sensors: any[]) => {
    // For PDF export, we'll create a simple HTML content and use the browser's print functionality
    // In a real application, you might want to use a library like jsPDF or Puppeteer
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sensor History Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .expired { color: #e53e3e; font-weight: bold; }
          .active { color: #38a169; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Sensor History Report</h1>
        <p>Generated on: ${dateFormatter.formatDate(new Date())}</p>
        <table>
          <thead>
            <tr>
              <th>Serial Number</th>
              <th>Manufacturer</th>
              <th>Model</th>
              <th>Date Added</th>
              <th>Expiration Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sensors.map(sensor => {
              const expirationDate = new Date(sensor.date_added);
              const durationDays = sensor.sensor_models?.duration_days || 10;
              expirationDate.setDate(expirationDate.getDate() + durationDays);
              
              const isExpired = expirationDate < new Date();
              
              return `
                <tr>
                  <td>${sensor.serial_number || ''}</td>
                  <td>${sensor.sensor_models?.manufacturer || ''}</td>
                  <td>${sensor.sensor_models?.model_name || ''}</td>
                  <td>${dateFormatter.formatDate(sensor.date_added)}</td>
                  <td>${dateFormatter.formatDate(expirationDate)}</td>
                  <td class="${isExpired ? 'expired' : 'active'}">
                    ${isExpired ? 'Expired' : 'Active'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Export Data
        </h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          Download your sensor history in various formats for backup or analysis.
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Export */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">CSV Export</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Spreadsheet format</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Export your sensor data as a CSV file that can be opened in Excel, Google Sheets, or other spreadsheet applications.
          </p>
          <ul className="text-xs text-gray-500 dark:text-slate-500 mb-4 space-y-1">
            <li>• All sensor records</li>
            <li>• Expiration dates calculated</li>
            <li>• Compatible with Excel</li>
            <li>• Easy data analysis</li>
          </ul>
          <button
            onClick={() => exportData('csv')}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>

        {/* PDF Export */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">PDF Report</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Formatted document</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Generate a formatted PDF report of your sensor history perfect for sharing with healthcare providers.
          </p>
          <ul className="text-xs text-gray-500 dark:text-slate-500 mb-4 space-y-1">
            <li>• Professional formatting</li>
            <li>• Healthcare provider ready</li>
            <li>• Print-friendly layout</li>
            <li>• Date-stamped report</li>
          </ul>
          <button
            onClick={() => exportData('pdf')}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {/* Export Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-base font-medium text-blue-900 dark:text-blue-300 mb-2">
          📋 Export Information
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Exports include all non-deleted sensor records</li>
          <li>• Expiration dates are calculated based on sensor model duration</li>
          <li>• Data is exported in chronological order (newest first)</li>
          <li>• CSV files can be imported into other applications</li>
          <li>• PDF reports are optimized for printing and sharing</li>
        </ul>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-slate-400">Processing export...</span>
        </div>
      )}
    </div>
  );
}