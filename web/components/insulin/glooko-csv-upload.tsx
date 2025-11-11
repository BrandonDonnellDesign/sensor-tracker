'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Info,
  HelpCircle
} from 'lucide-react';
import { GlookoFormatGuide } from './glooko-format-guide';

interface UploadResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: number;
  basalImported?: number;
  basalDuplicates?: number;
  fileType?: string;
}

interface GlookoCSVUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  className?: string;
}

export function GlookoCSVUpload({ onUploadComplete, className }: GlookoCSVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['Please select a CSV file'],
        duplicates: 0
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/insulin/import/glooko', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const uploadResult = await response.json();
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setResult(uploadResult);
      onUploadComplete?.(uploadResult);

    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
        duplicates: 0
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadSampleCSV = () => {
    const a = document.createElement('a');
    a.href = '/sample-glooko-insulin.csv';
    a.download = 'sample-glooko-insulin.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Glooko Insulin Data
              </CardTitle>
              <CardDescription>
                Upload your Glooko CSV export to import insulin dose history
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(!showGuide)}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Format Guide
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>How to export from Glooko:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Log into your Glooko account</li>
                  <li>Go to Reports → Data Export</li>
                  <li>Select date range and "Insulin" data type</li>
                  <li>Download the CSV file</li>
                  <li>Upload it here</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          {/* Sample CSV Download */}
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-sm font-medium">Need help with CSV format?</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Download a sample CSV to see the expected format
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
              <Download className="w-4 h-4 mr-2" />
              Sample CSV
            </Button>
          </div>

          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {isUploading ? 'Processing...' : 'Drop your Glooko CSV here'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  or click to browse files
                </p>
              </div>

              {!isUploading && (
                <Button variant="outline" size="sm" className="pointer-events-none">
                  Choose File
                </Button>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing CSV...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}>
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-2">
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Import completed successfully!
                    </p>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      {(result as any).fileType === 'basal_summary' ? (
                        <p>• {result.imported} daily basal totals imported</p>
                      ) : (
                        <p>• {result.imported} insulin doses imported</p>
                      )}
                      {(result as any).basalImported > 0 && (
                        <p>• {(result as any).basalImported} daily basal totals imported</p>
                      )}
                      {result.duplicates > 0 && (
                        <p>• {result.duplicates} duplicates skipped</p>
                      )}
                      {result.skipped > 0 && (
                        <p>• {result.skipped} entries skipped (invalid data)</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-red-800 dark:text-red-200">
                      Import failed
                    </p>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      {result.errors.map((error, index) => (
                        <p key={index}>• {error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Format Guide */}
      {showGuide && (
        <GlookoFormatGuide />
      )}
    </div>
  );
}