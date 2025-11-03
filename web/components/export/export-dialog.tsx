'use client';

import { useState } from 'react';
import { 
  Download, 
  FileText, 
  Database, 
  FileImage, 
  BarChart3,
  X,
  CheckCircle
} from 'lucide-react';
import { dataExporter, downloadUtils, ExportOptions } from '@/lib/export/data-exporter';
import { Database as DatabaseType } from '@/lib/database.types';

type Sensor = DatabaseType['public']['Tables']['sensors']['Row'];

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sensors: Sensor[];
}

export function ExportDialog({ isOpen, onClose, sensors }: ExportDialogProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeAnalytics: true,
    includePhotos: false,
    includeNotes: true
  });
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const options: ExportOptions = {
        ...exportOptions,
        ...(dateRange.start && dateRange.end ? {
          dateRange: {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end)
          }
        } : {})
      };

      const blob = await dataExporter.exportSensorData(sensors, options);
      const filename = downloadUtils.generateFilename(options.format);
      
      downloadUtils.downloadBlob(blob, filename);
      
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      value: 'csv',
      label: 'CSV',
      description: 'Spreadsheet format, great for Excel',
      icon: FileText,
      recommended: true
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'Raw data format for developers',
      icon: Database,
      recommended: false
    },
    {
      value: 'pdf',
      label: 'PDF Report',
      description: 'Formatted report for sharing',
      icon: FileImage,
      recommended: false
    }
  ];

  const filteredSensors = dateRange.start && dateRange.end 
    ? sensors.filter(sensor => {
        const sensorDate = new Date(sensor.date_added);
        return sensorDate >= new Date(dateRange.start) && sensorDate <= new Date(dateRange.end);
      })
    : sensors;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                Export Sensor Data
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Download your sensor data in various formats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Summary */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {filteredSensors.length} sensors will be exported
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {dateRange.start && dateRange.end 
                    ? `From ${new Date(dateRange.start).toLocaleDateString()} to ${new Date(dateRange.end).toLocaleDateString()}`
                    : 'All time data'
                  }
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
              Export Format
            </h3>
            <div className="grid gap-3">
              {formatOptions.map((format) => (
                <label
                  key={format.value}
                  className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    exportOptions.format === format.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={format.value}
                    checked={exportOptions.format === format.value}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                    className="sr-only"
                  />
                  <format.icon className="w-6 h-6 text-gray-600 dark:text-slate-400 mr-4" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {format.label}
                      </span>
                      {format.recommended && (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {format.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
              Date Range (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
              Include Additional Data
            </h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeAnalytics}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeAnalytics: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    Analytics Summary
                  </span>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Include success rates, trends, and performance metrics
                  </p>
                </div>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeNotes}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeNotes: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    Issue Notes
                  </span>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Include detailed notes about sensor issues
                  </p>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 opacity-50">
                <input
                  type="checkbox"
                  checked={exportOptions.includePhotos}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includePhotos: e.target.checked }))}
                  disabled
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    Photos (Coming Soon)
                  </span>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Include sensor photos in the export
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting || filteredSensors.length === 0}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}