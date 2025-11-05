'use client';

import { useState, useEffect, useCallback } from 'react';

export type CameraPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface UseCameraPermissionReturn {
  permission: CameraPermissionState;
  requestPermission: () => Promise<boolean>;
  hasCamera: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useCameraPermission(): UseCameraPermissionReturn {
  const [permission, setPermission] = useState<CameraPermissionState>('prompt');
  const [hasCamera, setHasCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Check if camera is available
  const checkCameraAvailability = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setPermission('unavailable');
        return;
      }

      // For all modern devices with MediaDevices API, assume camera exists
      // We'll verify actual availability during permission request
      setHasCamera(true);
      
      // Check current permission state if supported
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermission(permissionStatus.state as CameraPermissionState);
          
          // Listen for permission changes
          permissionStatus.onchange = () => {
            setPermission(permissionStatus.state as CameraPermissionState);
          };
        } catch (err) {
          // Fallback: permissions API not supported, assume prompt
          setPermission('prompt');
        }
      } else {
        setPermission('prompt');
      }
    } catch (err) {
      console.error('Error checking camera availability:', err);
      // On error, assume camera exists if MediaDevices API is available
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        setHasCamera(true);
        setPermission('prompt');
      } else {
        setError('Camera not supported on this device');
        setHasCamera(false);
        setPermission('unavailable');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment' // Prefer back camera for barcode scanning
        }
      });

      // Permission granted - clean up the stream
      stream.getTracks().forEach(track => track.stop());
      setPermission('granted');
      setHasCamera(true); // Confirm camera exists
      return true;

    } catch (err: any) {
      console.error('Camera permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermission('denied');
        setError('Camera access was denied. Please enable camera permissions in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermission('unavailable');
        setHasCamera(false); // Update camera availability
        setError('No camera found on this device.');
      } else if (err.name === 'NotSupportedError') {
        setPermission('unavailable');
        setHasCamera(false); // Update camera availability
        setError('Camera is not supported on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermission('unavailable');
        setError('Camera is already in use by another application.');
      } else {
        setPermission('denied');
        setError('Failed to access camera. Please check your browser settings.');
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkCameraAvailability();
  }, [checkCameraAvailability]);

  return {
    permission,
    requestPermission,
    hasCamera,
    isLoading,
    error
  };
}