import { FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function WarrantyPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-orange-600" />
            Warranty Claims & Issues
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track CGM issues and warranty claims for sensor replacements
          </p>
        </div>
        
        <Link
          href="/dashboard/sensors"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
          Back to Sensors
        </Link>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Warranty Claims Coming Soon</h3>
          <p className="text-muted-foreground mb-4">
            This feature is under development. For now, use the replacement tracking to monitor shipments.
          </p>
          <Link
            href="/dashboard/replacement-tracking"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Track Replacements
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export const metadata = {
  title: 'Warranty Claims - CGM Sensor Tracker',
  description: 'Track CGM issues and warranty claims for sensor replacements',
};