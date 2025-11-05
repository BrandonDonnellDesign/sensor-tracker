'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, Database, CheckCircle, Calendar } from 'lucide-react';


interface GlucoseExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataType: string;
}

export function GlucoseExportDialog({ open, onOpenChange, dataType }: GlucoseExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // today
  });
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportSuccess(false);

      // Create export data
      const exportData = {
        exportDate: new Date().toISOString(),
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        },
        dataType: dataType,
        format: exportFormat
      };

      // Make API call to export endpoint
      const response = await fetch('/api/v1/export/glucose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: exportData.format,
          startDate: exportData.dateRange.start,
          endDate: exportData.dateRange.end
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Handle the response based on format
      if (exportData.format === 'csv') {
        const csvData = await response.text();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glucose-data-${dateRange.start}-to-${dateRange.end}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glucose-data-${dateRange.start}-to-${dateRange.end}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Glucose Data
          </DialogTitle>
          <DialogDescription>
            Download your glucose readings in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Export Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  exportFormat === 'csv' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value as 'csv')}
                    className="sr-only"
                  />
                  <FileText className="h-5 w-5 mr-2" />
                  <div>
                    <div className="font-medium">CSV</div>
                    <div className="text-xs text-muted-foreground">Excel compatible</div>
                  </div>
                </label>

                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  exportFormat === 'json' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={(e) => setExportFormat(e.target.value as 'json')}
                    className="sr-only"
                  />
                  <Database className="h-5 w-5 mr-2" />
                  <div>
                    <div className="font-medium">JSON</div>
                    <div className="text-xs text-muted-foreground">Raw data</div>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Info */}
          <Alert>
            <AlertDescription>
              Your glucose data will be exported including timestamps, glucose values, trends, and source information.
            </AlertDescription>
          </Alert>

          {exportSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Export completed successfully! Your file has been downloaded.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full sm:w-auto"
          >
            <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Exporting...' : exportSuccess ? 'Exported!' : 'Export Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}