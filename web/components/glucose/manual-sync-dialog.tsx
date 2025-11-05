'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Zap, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface SyncStatus {
  isActive: boolean;
  lastSync?: string | null | undefined;
  tokenExpiry?: string | null | undefined;
  syncEnabled: boolean;
}

interface ManualSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: () => Promise<void>;
  syncStatus: SyncStatus;
}

export function ManualSyncDialog({ open, onOpenChange, onSync, syncStatus }: ManualSyncDialogProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      
      // Show progress message
      setSyncResult({
        success: true,
        message: 'Refreshing token and syncing data...'
      });
      
      await onSync();
      
      setSyncResult({
        success: true,
        message: 'Sync completed successfully! Token refreshed and data updated.'
      });
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed'
      });
    } finally {
      setSyncing(false);
    }
  };

  const getSyncStatusInfo = () => {
    if (!syncStatus.isActive) {
      return {
        status: 'Not Connected',
        description: 'Dexcom account is not connected',
        color: 'destructive' as const,
        icon: AlertTriangle
      };
    }

    if (!syncStatus.syncEnabled) {
      return {
        status: 'Sync Disabled',
        description: 'Automatic sync is disabled in settings',
        color: 'secondary' as const,
        icon: Settings
      };
    }

    const tokenExpiry = syncStatus.tokenExpiry ? new Date(syncStatus.tokenExpiry) : null;
    const isExpired = tokenExpiry && tokenExpiry <= new Date();
    
    if (isExpired) {
      return {
        status: 'Token Expired',
        description: 'Authentication token has expired and needs renewal',
        color: 'destructive' as const,
        icon: Clock
      };
    }

    return {
      status: 'Connected',
      description: 'Ready to sync glucose data',
      color: 'default' as const,
      icon: CheckCircle
    };
  };

  const statusInfo = getSyncStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manual Glucose Sync
          </DialogTitle>
          <DialogDescription>
            Manually sync your glucose data from Dexcom
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <StatusIcon className="h-4 w-4" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status:</span>
                <Badge variant={statusInfo.color}>{statusInfo.status}</Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>

              {syncStatus.lastSync && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Sync:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(syncStatus.lastSync), 'MMM dd, HH:mm')}
                  </span>
                </div>
              )}

              {syncStatus.tokenExpiry && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Token Expires:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(syncStatus.tokenExpiry), 'MMM dd, HH:mm')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Sync Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Manual sync will fetch the latest glucose readings from your Dexcom account. 
                This may take a few moments to complete.
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <div className="font-medium mb-1">What gets synced:</div>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Latest glucose readings</li>
                  <li>• Trend information</li>
                  <li>• Timestamp data</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Sync Result */}
          {syncResult && (
            <Alert variant={syncResult.success ? 'default' : 'destructive'}>
              <AlertDescription>
                {syncResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Connection Issues */}
          {!syncStatus.isActive && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You need to connect your Dexcom account before you can sync data.
                <Button variant="link" className="p-0 ml-2 h-auto" asChild>
                  <a href="/dashboard/settings/integrations">Connect Dexcom</a>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {syncStatus.isActive && !syncStatus.syncEnabled && (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Automatic sync is disabled. You can enable it in your integration settings.
                <Button variant="link" className="p-0 ml-2 h-auto" asChild>
                  <a href="/dashboard/settings/integrations">Sync Settings</a>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : syncStatus.isActive ? 'Start Sync' : 'Try Sync Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}