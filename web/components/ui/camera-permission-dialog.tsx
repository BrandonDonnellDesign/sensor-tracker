'use client';

import { Camera, AlertCircle, Settings, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CameraPermissionDialogProps {
  isOpen: boolean;
  onRequestPermission: () => Promise<boolean>;
  onCancel: () => void;
  error?: string | null;
  isLoading?: boolean;
}

export function CameraPermissionDialog({
  isOpen,
  onRequestPermission,
  onCancel,
  error,
  isLoading = false
}: CameraPermissionDialogProps) {
  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await onRequestPermission();
    if (!granted && !error) {
      // Permission was denied, show instructions
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl">Camera Access Required</CardTitle>
          <CardDescription>
            To scan food barcodes, we need access to your device's camera
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Camera Access Issue
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              </div>

              {error.includes('denied') && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    How to enable camera access:
                  </p>
                  <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
                    <div className="flex items-start gap-2">
                      <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Mobile:</p>
                        <p>Tap the camera icon in your browser's address bar and select "Allow"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Settings className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Desktop:</p>
                        <p>Click the camera icon in the address bar or check browser settings</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Why we need camera access:
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Scan food product barcodes</li>
                    <li>• Quickly identify nutritional information</li>
                    <li>• Make food logging faster and more accurate</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestPermission}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Requesting...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Allow Camera
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Your privacy is important. Camera access is only used for barcode scanning and no images are stored.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}