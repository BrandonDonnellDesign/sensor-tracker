'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export function DataExport() {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState({
    includeGlucose: true,
    includeInsulin: true,
    includeFood: true,
    includeSensors: true,
    includeOrders: true,
    includeInventory: true,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        ...Object.fromEntries(
          Object.entries(options).map(([key, value]) => [key, value.toString()])
        ),
      });

      const response = await fetch(`/api/export/user-data?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diabetes-data-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Your Data</CardTitle>
        <CardDescription>
          Download all your diabetes data for insurance claims, doctor visits, or personal records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-3">
          <Label>Export Format</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'json' | 'csv')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json" />
              <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                <FileJson className="h-4 w-4" />
                JSON (Complete data with all fields)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                CSV (Spreadsheet format, easier to read)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Data Selection */}
        <div className="space-y-3">
          <Label>Include Data</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="glucose"
                checked={options.includeGlucose}
                onCheckedChange={() => toggleOption('includeGlucose')}
              />
              <Label htmlFor="glucose" className="cursor-pointer">
                Glucose readings
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="insulin"
                checked={options.includeInsulin}
                onCheckedChange={() => toggleOption('includeInsulin')}
              />
              <Label htmlFor="insulin" className="cursor-pointer">
                Insulin doses
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="food"
                checked={options.includeFood}
                onCheckedChange={() => toggleOption('includeFood')}
              />
              <Label htmlFor="food" className="cursor-pointer">
                Food logs
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sensors"
                checked={options.includeSensors}
                onCheckedChange={() => toggleOption('includeSensors')}
              />
              <Label htmlFor="sensors" className="cursor-pointer">
                Sensor history
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="orders"
                checked={options.includeOrders}
                onCheckedChange={() => toggleOption('includeOrders')}
              />
              <Label htmlFor="orders" className="cursor-pointer">
                Supply orders
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="inventory"
                checked={options.includeInventory}
                onCheckedChange={() => toggleOption('includeInventory')}
              />
              <Label htmlFor="inventory" className="cursor-pointer">
                Current inventory
              </Label>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={exporting || !Object.values(options).some(v => v)}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export Data'}
        </Button>

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Your data is exported securely and never shared with third parties</p>
          <p>• JSON format includes all fields and metadata</p>
          <p>• CSV format is optimized for spreadsheet applications</p>
          <p>• Perfect for insurance claims, doctor appointments, or personal backup</p>
        </div>
      </CardContent>
    </Card>
  );
}
