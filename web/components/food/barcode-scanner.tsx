'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { logger } from '@/lib/logger';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [_isScanning, _setIsScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        logger.error('Camera error:', err);
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera access was denied. Please enable camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera is not supported on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is already in use by another application.');
        } else {
          setError('Failed to access camera. Please check your browser settings.');
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleManualEntry = () => {
    const barcode = prompt('Enter barcode manually:');
    if (barcode) {
      onScan(barcode);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Scan Barcode
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <Camera className="w-16 h-16 mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
                  Camera Access Issue
                </h3>
                <p className="text-red-600 dark:text-red-400 mb-4 text-sm">{error}</p>
                
                {error.includes('denied') && (
                  <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 mb-4 text-left">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      To enable camera access:
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      <li>• Look for a camera icon in your browser's address bar</li>
                      <li>• Click it and select "Allow" for camera access</li>
                      <li>• Refresh the page and try again</li>
                    </ul>
                  </div>
                )}
                
                <button
                  onClick={handleManualEntry}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Enter Barcode Manually
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                  Position the barcode within the frame
                </p>
                <button
                  onClick={handleManualEntry}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Enter barcode manually instead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
