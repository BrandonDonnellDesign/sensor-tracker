'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isInWebAppiOS);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay if user hasn't dismissed it
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation dismissed');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('PWA installation error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex-shrink-0">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">
              Install Insulin Tracker
            </h4>
            <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
              Add to your home screen for quick access to insulin tracking, even offline!
            </p>
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-3 w-3 mr-1" />
                Install App
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs"
              >
                Not Now
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Features list */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-slate-400">
            <div className="flex items-center space-x-1">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span>
              <span>Offline access</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span>
              <span>Push notifications</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span>
              <span>Quick shortcuts</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span>
              <span>Native app feel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}