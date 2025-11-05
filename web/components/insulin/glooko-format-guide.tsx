'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Info
} from 'lucide-react';

export function GlookoFormatGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Glooko CSV Format Guide
        </CardTitle>
        <CardDescription>
          Understanding the expected CSV format for insulin data import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Columns */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Required Columns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <Badge variant="secondary" className="mb-2">Date/Time</Badge>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Possible column names: Date, Timestamp, Event Date, Log Date
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <Badge variant="secondary" className="mb-2">Insulin Type</Badge>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Possible names: Insulin Type, Medication, Drug Name, Type
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <Badge variant="secondary" className="mb-2">Dose Amount</Badge>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Possible names: Dose, Amount, Units, Dosage, Value
              </p>
            </div>
          </div>
        </div>

        {/* Optional Columns */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Optional Columns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Badge variant="outline" className="mb-2">Injection Site</Badge>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Body location where insulin was injected
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Badge variant="outline" className="mb-2">Notes</Badge>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Additional comments or context
              </p>
            </div>
          </div>
        </div>

        {/* Supported Insulin Types */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Recognized Insulin Types
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'Humalog', 'NovoLog', 'Apidra', 'Fiasp',
              'Regular', 'Humulin R', 'Novolin R',
              'NPH', 'Humulin N', 'Novolin N',
              'Lantus', 'Levemir', 'Tresiba', 'Basaglar',
              'Toujeo', '70/30', '75/25'
            ].map((insulin) => (
              <Badge key={insulin} variant="outline" className="text-xs">
                {insulin}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Other insulin names will be imported as-is and can be mapped later.
          </p>
        </div>

        {/* Date Format Examples */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Supported Date Formats
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
              <div>2024-11-01 08:30:00</div>
              <div>11/01/2024 8:30 AM</div>
              <div>2024-11-01T08:30:00Z</div>
              <div>01.11.2024 08:30</div>
              <div>11/1/24 8:30</div>
              <div>2024-11-01</div>
            </div>
          </div>
        </div>

        {/* Sample CSV */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Sample CSV Structure
          </h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto">
            <div>Date,Time,Insulin Type,Dose (units),Injection Site,Notes</div>
            <div>2024-11-01,08:30,Humalog,12,Abdomen,Before breakfast</div>
            <div>2024-11-01,12:15,Humalog,8,Thigh,Before lunch</div>
            <div>2024-11-01,18:45,Humalog,10,Arm,Before dinner</div>
            <div>2024-11-01,22:00,Lantus,24,Abdomen,Bedtime dose</div>
          </div>
        </div>

        {/* Important Notes */}
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Important Notes:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>The system will automatically detect column names (case-insensitive)</li>
                <li>Duplicate entries (same medication, dose, and time ±5 minutes) will be skipped</li>
                <li>Invalid rows will be skipped and reported in the import summary</li>
                <li>All times are converted to your local timezone</li>
                <li>Dose amounts should be numeric (units like "u" or "units" will be stripped)</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}