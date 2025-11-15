'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useDateTimeFormatter } from '@/utils/date-formatter';
import { Download, FileText, Database } from 'lucide-react';

interface ExportSettingsProps {
  userId?: string;
}

type DataType = 'sensors' | 'insulin' | 'food' | 'glucose' | 'all';

export function ExportSettings({ userId }: ExportSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>(['all']);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dateFormatter = useDateTimeFormatter();

  const toggleDataType = (type: DataType) => {
    if (type === 'all') {
      setSelectedDataTypes(['all']);
    } else {
      const newTypes = selectedDataTypes.filter(t => t !== 'all');
      if (newTypes.includes(type)) {
        const filtered = newTypes.filter(t => t !== type);
        setSelectedDataTypes(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedDataTypes([...newTypes, type]);
      }
    }
  };

  const exportData = async (format: 'csv' | 'pdf') => {
    if (!userId) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const dataToExport: any = {};

      const includeAll = selectedDataTypes.includes('all');

      // Fetch sensor data
      if (includeAll || selectedDataTypes.includes('sensors')) {
        const { data: sensors } = await supabase
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
        dataToExport.sensors = sensors || [];
      }

      // Fetch insulin data
      if (includeAll || selectedDataTypes.includes('insulin')) {
        const { data: insulin } = await supabase
          .from('insulin_logs')
          .select('*')
          .eq('user_id', userId)
          .order('taken_at', { ascending: false });
        dataToExport.insulin = insulin || [];
      }

      // Fetch food data
      if (includeAll || selectedDataTypes.includes('food')) {
        const { data: food } = await supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false });
        dataToExport.food = food || [];
      }

      // Fetch glucose data
      if (includeAll || selectedDataTypes.includes('glucose')) {
        const { data: glucose } = await supabase
          .from('glucose_readings')
          .select('*')
          .eq('user_id', userId)
          .order('reading_time', { ascending: false });
        dataToExport.glucose = glucose || [];
      }

      if (format === 'csv') {
        await exportToCSV(dataToExport);
      } else {
        await exportToPDF(dataToExport);
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

  const exportToCSV = async (data: any) => {
    const zip = await import('jszip');
    const JSZip = zip.default;
    const zipFile = new JSZip();

    // Export sensors
    if (data.sensors && data.sensors.length > 0) {
      const headers = ['Serial Number', 'Manufacturer', 'Model', 'Lot Number', 'Date Added', 'Expiration Date', 'Status', 'Problematic', 'Notes'];
      const csvData = data.sensors.map((sensor: any) => {
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
      const csvContent = [headers.join(','), ...csvData.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n');
      zipFile.file('sensors.csv', csvContent);
    }

    // Export insulin
    if (data.insulin && data.insulin.length > 0) {
      const headers = ['Date/Time', 'Units', 'Insulin Type', 'Insulin Name', 'Delivery Type', 'Meal Relation', 'Blood Glucose Before', 'Notes'];
      const csvData = data.insulin.map((log: any) => [
        dateFormatter.formatDateTime(log.taken_at),
        log.units,
        log.insulin_type,
        log.insulin_name || '',
        log.delivery_type || '',
        log.meal_relation || '',
        log.blood_glucose_before || '',
        log.notes || ''
      ]);
      const csvContent = [headers.join(','), ...csvData.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n');
      zipFile.file('insulin.csv', csvContent);
    }

    // Export food
    if (data.food && data.food.length > 0) {
      const headers = ['Date/Time', 'Food Name', 'Calories', 'Carbs (g)', 'Protein (g)', 'Fat (g)', 'Serving Size', 'Servings', 'Meal Type', 'Source'];
      const csvData = data.food.map((log: any) => [
        dateFormatter.formatDateTime(log.logged_at),
        log.food_name,
        log.calories || 0,
        log.carbs || 0,
        log.protein || 0,
        log.fat || 0,
        log.serving_size || '',
        log.servings || 1,
        log.meal_type || '',
        log.source || 'manual'
      ]);
      const csvContent = [headers.join(','), ...csvData.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n');
      zipFile.file('food.csv', csvContent);
    }

    // Export glucose
    if (data.glucose && data.glucose.length > 0) {
      const headers = ['Date/Time', 'Glucose (mg/dL)', 'Reading Type', 'Notes'];
      const csvData = data.glucose.map((reading: any) => [
        dateFormatter.formatDateTime(reading.reading_time),
        reading.glucose_value,
        reading.reading_type || '',
        reading.notes || ''
      ]);
      const csvContent = [headers.join(','), ...csvData.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))].join('\n');
      zipFile.file('glucose.csv', csvContent);
    }

    // Generate and download ZIP
    const content = await zipFile.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(content);
    link.setAttribute('href', url);
    link.setAttribute('download', `diabetes-data-export-${new Date().toISOString().split('T')[0]}.zip`);
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
          Download your diabetes data in various formats for backup, analysis, or sharing with healthcare providers.
        </p>
      </div>

      {/* Data Type Selection */}
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Select Data to Export
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'all', label: 'All Data', icon: '📊' },
            { id: 'sensors', label: 'Sensors', icon: '🔬' },
            { id: 'insulin', label: 'Insulin', icon: '💉' },
            { id: 'food', label: 'Food', icon: '🍽️' },
            { id: 'glucose', label: 'Glucose', icon: '📈' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => toggleDataType(type.id as DataType)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedDataTypes.includes(type.id as DataType) || selectedDataTypes.includes('all')
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                {type.label}
              </div>
            </button>
          ))}
        </div>
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
              <Download className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">CSV Export</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Spreadsheet format (ZIP)</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Export your data as CSV files in a ZIP archive. Each data type gets its own file for easy analysis.
          </p>
          <ul className="text-xs text-gray-500 dark:text-slate-500 mb-4 space-y-1">
            <li>• Separate CSV per data type</li>
            <li>• Compatible with Excel/Sheets</li>
            <li>• Easy data analysis</li>
            <li>• Organized in ZIP file</li>
          </ul>
          <button
            onClick={() => exportData('csv')}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download CSV (ZIP)
              </>
            )}
          </button>
        </div>

        {/* PDF Export */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mr-3">
              <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">PDF Report</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Formatted document</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Generate a comprehensive PDF report with all selected data types, perfect for healthcare providers.
          </p>
          <ul className="text-xs text-gray-500 dark:text-slate-500 mb-4 space-y-1">
            <li>• Professional formatting</li>
            <li>• Healthcare provider ready</li>
            <li>• Print-friendly layout</li>
            <li>• Comprehensive overview</li>
          </ul>
          <button
            onClick={() => exportData('pdf')}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Export Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-base font-medium text-blue-900 dark:text-blue-300 mb-2">
          📋 Export Information
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Select specific data types or export everything</li>
          <li>• CSV exports are organized in a ZIP file with separate files per data type</li>
          <li>• Data is exported in chronological order (newest first)</li>
          <li>• Insulin logs include dosage, type, timing, and blood glucose readings</li>
          <li>• Food logs include nutrition information and meal timing</li>
          <li>• PDF reports provide a comprehensive overview for healthcare providers</li>
        </ul>
      </div>
    </div>
  );
}