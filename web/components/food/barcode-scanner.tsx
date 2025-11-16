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
    let mounted = true;

    const startCamera = async () => {
      try {
        // Check if MediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (mounted) {
            setError('Camera is not supported in this browser. Please use a modern browser like Chrome, Safari, or Firefox.');
          }
          return;
        }

        console.log('Attempting to access camera...');

        // Try simplest approach first - just request video
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log('Camera access granted with basic constraints');
        } catch (basicError: any) {
          console.log('Basic camera access failed, trying with facingMode:', basicError.name);
          
          // Try with facingMode as fallback
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment' }
            });
            console.log('Camera access granted with environment facingMode');
          } catch (facingError: any) {
            console.log('Environment camera failed, trying user-facing:', facingError.name);
            
            // Last attempt with user-facing camera
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user' }
            });
            console.log('Camera access granted with user facingMode');
          }
        }
        
        if (mounted && videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          console.log('Camera stream attached to video element');
        }
      } catch (err: any) {
        if (!mounted) return;
        
        console.error('All camera access attempts failed:', err.name, err.message, err);
        logger.error('Camera error:', err);
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera access was denied. Please enable camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found. Please check if your device has a camera and it\'s not being used by another app.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera is not supported on this device or browser.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is already in use by another application. Please close other apps using the camera.');
        } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
          setError('Camera settings could not be applied. Please try again.');
        } else if (err.name === 'TypeError') {
          setError('Camera access error. Please ensure you\'re using HTTPS or localhost.');
        } else {
          setError(`Camera error: ${err.message || err.name || 'Unknown error'}. Please try entering the barcode manually.`);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
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
                <p className="text-red-600 dark:text-red-400 mb-4 text-sm whitespace-pre-wrap">{error}</p>
                
                {/* Debug info */}
                <details className="text-left mb-4">
                  <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer mb-2 hover:underline">
                    Show Technical Details
                  </summary>
                  <div className="bg-red-100 dark:bg-red-900/30 rounded p-3 text-xs font-mono text-red-800 dark:text-red-200 overflow-auto max-h-40">
                    <div className="mb-1"><strong>Browser:</strong> {navigator.userAgent.substring(0, 100)}...</div>
                    <div className="mb-1"><strong>MediaDevices:</strong> {navigator.mediaDevices ? '✓ Available' : '✗ Not Available'}</div>
                    <div className="mb-1"><strong>getUserMedia:</strong> {typeof navigator.mediaDevices?.getUserMedia === 'function' ? '✓ Available' : '✗ Not Available'}</div>
                    <div className="mb-1"><strong>Protocol:</strong> {window.location.protocol}</div>
                    <div className="mb-1"><strong>Host:</strong> {window.location.host}</div>
                    <div className="mb-1"><strong>HTTPS:</strong> {window.location.protocol === 'https:' ? '✓ Yes' : '✗ No (required for camera)'}</div>
                  </div>
                </details>
                
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
