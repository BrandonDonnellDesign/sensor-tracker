'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Upload, FileText, Package, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: number;
  merged?: number;
  message?: string;
  totalFiles?: number;
  totalRows?: number;
}

export default function InsulinImportPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file || !user) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/insulin/import/glooko', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Clear the file input after successful import
        setFile(null);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['Failed to upload file. Please try again.'],
        duplicates: 0
      });
    } finally {
      setImporting(false);
    }
  };

  const isZipFile = file?.name.toLowerCase().endsWith('.zip');
  const isCsvFile = file?.name.toLowerCase().endsWith('.csv');
  const isValidFile = isZipFile || isCsvFile;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Import Insulin Data
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Import your insulin doses from Glooko CSV files or ZIP exports
            </p>
          </div>
          <Link
            href="/dashboard/insulin"
            className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ← Back to Insulin
          </Link>
        </div>

        {/* Instructions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            How to Import Your Data
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CSV Import */}
            <div className="space-y-3">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-gray-900 dark:text-slate-100">CSV Files</h3>
              </div>
              <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                <li>• Export insulin data from Glooko as CSV</li>
                <li>• Supports standard Glooko column formats</li>
                <li>• Automatically detects insulin types and doses</li>
                <li>• Handles timestamps and carb information</li>
              </ul>
            </div>

            {/* ZIP Import */}
            <div className="space-y-3">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="font-medium text-gray-900 dark:text-slate-100">ZIP Archives</h3>
              </div>
              <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                <li>• Upload complete Glooko data exports</li>
                <li>• Automatically finds bolus_data_* files</li>
                <li>• Processes multiple files at once</li>
                <li>• Extracts and imports all insulin records</li>
              </ul>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Upload File
          </h2>
          
          <div className="space-y-4">
            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-slate-400">
                  Choose a CSV file or ZIP archive from Glooko
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.zip"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 dark:text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900/20 dark:file:text-blue-300
                    dark:hover:file:bg-blue-900/30"
                />
              </div>
            </div>

            {/* File Info */}
            {file && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center">
                  {isZipFile ? (
                    <Package className="h-5 w-5 text-green-600 mr-3" />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-600 mr-3" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {isZipFile ? 'ZIP Archive' : 'CSV File'}
                    </p>
                  </div>
                </div>
                
                {isValidFile && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Data
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {file && !isValidFile && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    Please select a CSV or ZIP file from Glooko
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Import Results */}
        {result && (
          <div className={`rounded-lg p-6 border ${
            result.success 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center mb-4">
              {result.success ? (
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              )}
              <h3 className={`text-lg font-semibold ${
                result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {result.success ? 'Import Successful!' : 'Import Failed'}
              </h3>
            </div>

            {result.success && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {result.imported}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    New Records
                  </div>
                </div>
                {result.merged && result.merged > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {result.merged}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Merged
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {result.duplicates}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    Duplicates
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                    {result.skipped}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Skipped
                  </div>
                </div>
                {result.totalFiles && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {result.totalFiles}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Files Processed
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.message && (
              <p className={`text-sm mb-3 ${
                result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {result.message}
              </p>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-800 dark:text-red-200">
                  Errors ({result.errors.length}):
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-700 dark:text-red-300">
                      • {error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.success && result.imported > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                <Link
                  href="/dashboard/insulin"
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  View Imported Data →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}