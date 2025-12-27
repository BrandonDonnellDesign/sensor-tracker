'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Keyboard, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Barcode scanner props
 */
interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
  className?: string;
}

/**
 * Scanner state
 */
type ScannerState = 'idle' | 'requesting-permission' | 'scanning' | 'manual-entry' | 'permission-denied' | 'error';

/**
 * Barcode scanner component with camera integration and manual fallback
 * Uses Quagga.js for barcode detection
 */
export function BarcodeScanner({ onBarcodeDetected, onClose, isOpen, className = '' }: BarcodeScannerProps) {
  const [state, setState] = useState<ScannerState>('idle');
  const [error, setError] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [detectedBarcode, setDetectedBarcode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const quaggaInitialized = useRef(false);

  /**
   * Initialize Quagga barcode scanner
   */
  const initializeQuagga = useCallback(async () => {
    if (!videoRef.current || quaggaInitialized.current) return;

    try {
      // Dynamically import Quagga
      const Quagga = (await import('quagga')).default;
      
      const config = {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: videoRef.current,
          constraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: 'environment', // Use back camera
            aspectRatio: { min: 1, max: 2 }
          }
        },
        locator: {
          patchSize: 'medium',
          halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10,
        decoder: {
          readers: [
            'code_128_reader',
            'ean_reader',
            'ean_8_reader',
            'code_39_reader',
            'code_39_vin_reader',
            'codabar_reader',
            'upc_reader',
            'upc_e_reader',
            'i2of5_reader'
          ]
        },
        locate: true
      };

      await new Promise<void>((resolve, reject) => {
        Quagga.init(config, (err: any) => {
          if (err) {
            console.error('Quagga initialization error:', err);
            reject(err);
            return;
          }
          resolve();
        });
      });

      // Set up barcode detection handler
      Quagga.onDetected((result: any) => {
        if (isProcessing) return;
        
        const code = result.codeResult.code;
        if (code && /^\d{8,14}$/.test(code)) {
          setDetectedBarcode(code);
          setIsProcessing(true);
          
          // Auto-submit after brief delay to show detection
          setTimeout(() => {
            onBarcodeDetected(code);
            stopScanning();
          }, 500);
        }
      });

      Quagga.start();
      quaggaInitialized.current = true;
      setState('scanning');

    } catch (error) {
      console.error('Failed to initialize Quagga:', error);
      setState('error');
      setError('Failed to initialize barcode scanner');
    }
  }, [onBarcodeDetected, isProcessing]);

  /**
   * Start camera and barcode scanning
   */
  const startScanning = useCallback(async () => {
    setState('requesting-permission');
    setError('');
    setDetectedBarcode('');
    setIsProcessing(false);

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize Quagga after video is ready
      setTimeout(() => {
        initializeQuagga();
      }, 100);

    } catch (error: any) {
      console.error('Camera access error:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setState('permission-denied');
        setError('Camera permission denied. Please enable camera access or use manual entry.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setState('error');
        setError('No camera found. Please use manual barcode entry.');
      } else {
        setState('error');
        setError('Failed to access camera. Please try manual entry.');
      }
    }
  }, [initializeQuagga]);

  /**
   * Stop scanning and cleanup
   */
  const stopScanning = useCallback(async () => {
    try {
      // Stop Quagga
      if (quaggaInitialized.current) {
        const Quagga = (await import('quagga')).default;
        Quagga.stop();
        quaggaInitialized.current = false;
      }

      // Stop video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setState('idle');
      setDetectedBarcode('');
      setIsProcessing(false);
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  }, []);

  /**
   * Handle manual barcode submission
   */
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const barcode = manualBarcode.trim();
    if (!barcode) return;

    if (!/^\d{8,14}$/.test(barcode)) {
      setError('Please enter a valid barcode (8-14 digits)');
      return;
    }

    onBarcodeDetected(barcode);
    setManualBarcode('');
  };

  /**
   * Switch to manual entry mode
   */
  const switchToManualEntry = () => {
    stopScanning();
    setState('manual-entry');
    setError('');
  };

  /**
   * Switch back to camera scanning
   */
  const switchToCamera = () => {
    setState('idle');
    setError('');
    setManualBarcode('');
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    stopScanning();
    onClose();
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [isOpen, stopScanning]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Scan Barcode
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Camera Scanner */}
          {(state === 'idle' || state === 'requesting-permission' || state === 'scanning') && (
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {/* Scanning Overlay */}
                {state === 'scanning' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-500 rounded-lg w-48 h-32 relative">
                      <div className="absolute inset-0 border border-green-500 rounded-lg animate-pulse" />
                      {detectedBarcode && (
                        <div className="absolute -bottom-8 left-0 right-0 text-center">
                          <div className="inline-flex items-center space-x-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>{detectedBarcode}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {state === 'requesting-permission' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                      <p className="text-sm">Requesting camera access...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-3">
                {state === 'idle' && (
                  <button
                    onClick={startScanning}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Start Camera</span>
                  </button>
                )}

                {state === 'scanning' && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Position barcode within the frame
                    </p>
                    <button
                      onClick={stopScanning}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Stop Scanning
                    </button>
                  </div>
                )}

                <button
                  onClick={switchToManualEntry}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Enter Manually</span>
                </button>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          {state === 'manual-entry' && (
            <div className="space-y-4">
              <div className="text-center">
                <Keyboard className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  Enter Barcode
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Type the barcode numbers manually
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 8-14 digit barcode"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    maxLength={14}
                    autoFocus
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={!manualBarcode.trim() || !/^\d{8,14}$/.test(manualBarcode)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={switchToCamera}
                    className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Camera</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Permission Denied */}
          {state === 'permission-denied' && (
            <div className="space-y-4 text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Camera Access Denied
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Please enable camera permissions in your browser settings to scan barcodes.
                </p>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={startScanning}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={switchToManualEntry}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Enter Manually Instead
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="space-y-4 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Scanner Error
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {error || 'Unable to start barcode scanner'}
                </p>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={startScanning}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={switchToManualEntry}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Enter Manually Instead
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && state === 'manual-entry' && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Barcode scanner hook for easier integration
 */
export function useBarcodeScannerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [onDetected, setOnDetected] = useState<((barcode: string) => void) | null>(null);

  const openScanner = (callback: (barcode: string) => void) => {
    setOnDetected(() => callback);
    setIsOpen(true);
  };

  const closeScanner = () => {
    setIsOpen(false);
    setOnDetected(null);
  };

  const handleBarcodeDetected = (barcode: string) => {
    if (onDetected) {
      onDetected(barcode);
    }
    closeScanner();
  };

  return {
    isOpen,
    openScanner,
    closeScanner,
    BarcodeScanner: (props: Omit<BarcodeScannerProps, 'onBarcodeDetected' | 'onClose' | 'isOpen'>) => (
      <BarcodeScanner
        {...props}
        isOpen={isOpen}
        onBarcodeDetected={handleBarcodeDetected}
        onClose={closeScanner}
      />
    )
  };
}