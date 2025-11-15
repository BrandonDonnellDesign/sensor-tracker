'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, Flashlight, RotateCcw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface EnhancedBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function EnhancedBarcodeScanner({ onScan, onClose }: EnhancedBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError('');
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        
        // Check if flash is available
        const videoTrack = newStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();
        setHasFlash('torch' in capabilities);
      }

      setIsScanning(true);
      startBarcodeDetection();

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

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return;

    try {
      const videoTrack = stream.getVideoTracks()[0];
      await videoTrack.applyConstraints({
        advanced: [{ torch: !flashOn } as any]
      });
      setFlashOn(!flashOn);
    } catch (err) {
      logger.error('Flash toggle error:', err);
    }
  };

  const switchCamera = () => {
    setFacingMode(facingMode === 'user' ? 'environment' : 'user');
  };

  const startBarcodeDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const detectBarcode = () => {
      if (!isScanning || !context) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for barcode detection
      // const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Simple barcode detection simulation
      // In a real implementation, you'd use a library like QuaggaJS or ZXing
      // For now, we'll just provide the manual entry option
      // TODO: Implement actual barcode detection using imageData
      
      // Continue scanning
      if (isScanning) {
        requestAnimationFrame(detectBarcode);
      }
    };

    // Start detection when video is ready
    video.addEventListener('loadedmetadata', () => {
      detectBarcode();
    });
  };

  const handleManualEntry = () => {
    const barcode = prompt('Enter barcode manually:');
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Scan Food Barcode
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          {error ? (
            <div className="p-8 text-center">
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
              {/* Video Feed */}
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 sm:h-80 object-cover"
                />
                
                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-orange-500 bg-orange-500/10 rounded-lg w-64 h-32 relative">
                    <div className="absolute inset-0 border-2 border-dashed border-orange-300 rounded-lg animate-pulse"></div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm">
                      Position barcode here
                    </div>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {hasFlash && (
                    <button
                      onClick={toggleFlash}
                      className={`p-2 rounded-full transition-colors ${
                        flashOn 
                          ? 'bg-yellow-500 text-white' 
                          : 'bg-black/50 text-white hover:bg-black/70'
                      }`}
                    >
                      <Flashlight className="w-5 h-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={switchCamera}
                    className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Instructions and Manual Entry */}
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                    Position the barcode within the orange frame above
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Scanning for barcodes...
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <p className="text-sm text-gray-600 dark:text-slate-400 text-center mb-3">
                    Having trouble? Enter the barcode manually:
                  </p>
                  <button
                    onClick={handleManualEntry}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    Enter Barcode Manually
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}