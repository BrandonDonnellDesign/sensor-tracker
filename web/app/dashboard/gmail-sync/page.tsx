'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SyncError {
  id: string;
  category: string;
  severity: string;
  message: string;
  details: any;
  email_id?: string;
  order_id?: string;
  created_at: string;
}

interface UnmatchedEmail {
  id: string;
  email_id: string;
  vendor: string;
  subject: string;
  parsed_data: any;
  email_date: string;
  reviewed: boolean;
  created_at: string;
}

interface ErrorStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}

export default function GmailSyncUserPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [unmatchedEmails, setUnmatchedEmails] = useState<UnmatchedEmail[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
      loadHistory();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load errors
      const errorsRes = await fetch('/api/gmail/sync-errors');
      if (errorsRes.ok) {
        const errorsData = await errorsRes.json();
        setErrors(errorsData.errors || []);
        setStats(errorsData.stats || null);
      } else {
        console.warn('Could not load sync errors:', errorsRes.status);
      }

      // Load unmatched emails
      const unmatchedRes = await fetch('/api/gmail/unmatched-emails');
      if (unmatchedRes.ok) {
        const unmatchedData = await unmatchedRes.json();
        setUnmatchedEmails(unmatchedData.emails || []);
      } else {
        console.warn('Could not load unmatched emails:', unmatchedRes.status);
      }
    } catch (error) {
      console.error('Failed to load sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkReviewed = async (emailId: string) => {
    try {
      const res = await fetch(`/api/gmail/unmatched-emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: true }),
      });

      if (res.ok) {
        setUnmatchedEmails(prev => 
          prev.map(e => e.id === emailId ? { ...e, reviewed: true } : e)
        );
      } else {
        console.warn('Could not mark email as reviewed (table may not exist yet)');
      }
    } catch (error) {
      console.warn('Failed to mark as reviewed:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/gmail/sync', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setSyncResults(data);
        await loadData(); // Refresh errors and unmatched
        await loadHistory(); // Refresh history
      } else {
        setSyncResults({
          success: false,
          error: data.error || 'Sync failed',
          message: data.message || 'An error occurred during sync'
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResults({
        success: false,
        error: 'Network error',
        message: 'Failed to connect to sync service'
      });
    } finally {
      setSyncing(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/gmail/history');
      const data = await response.json();
      if (data.emails) {
        setHistory(data.emails);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gmail Sync Status</h1>
          <p className="text-muted-foreground">
            Monitor sync health, trigger manual syncs, and review errors
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            🔒 Privacy: Only your data is shown here
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} disabled={syncing} variant="default">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Card if no data */}
      {!stats && errors.length === 0 && unmatchedEmails.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gmail Sync Monitoring</CardTitle>
            <CardDescription>
              This page tracks errors and unmatched emails from your Gmail sync
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Everything looks good!</p>
                <p className="text-sm text-muted-foreground">
                  No sync errors or unmatched emails found. Your Gmail sync is working perfectly.
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">What gets tracked here:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Emails that couldn't be parsed</li>
                <li>• Orders that couldn't be matched</li>
                <li>• Inventory update failures</li>
                <li>• Gmail API errors</li>
              </ul>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Connect Gmail in Settings to start automatic order tracking.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => router.push('/dashboard/settings')}
              >
                Go to Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical/Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {(stats.bySeverity.critical || 0) + (stats.bySeverity.error || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.bySeverity.warning || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unmatched Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {unmatchedEmails.filter(e => !e.reviewed).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Results */}
      {syncResults && (
        <Card className={syncResults.success === false ? 'border-red-500/50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncResults.success === false ? (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Sync Failed
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Sync Complete
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncResults.success === false ? (
              <div className="space-y-3">
                <p className="text-sm text-red-500">
                  {syncResults.message || 'An error occurred during sync'}
                </p>
                {syncResults.error && (
                  <p className="text-xs text-muted-foreground">
                    Error: {syncResults.error}
                  </p>
                )}
                {syncResults.message?.includes('not connected') && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      To use Gmail sync, you need to connect your Gmail account first.
                    </p>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => router.push('/dashboard/settings')}
                    >
                      Connect Gmail in Settings
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {syncResults.message} - Found {syncResults.totalFound || 0} emails, processed {syncResults.emailsProcessed || 0}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">
            Sync Errors ({errors.length})
          </TabsTrigger>
          <TabsTrigger value="unmatched">
            Unmatched Emails ({unmatchedEmails.filter(e => !e.reviewed).length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Sync History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          {errors.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No sync errors found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            errors.map((error) => (
              <Card key={error.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(error.severity)}
                      <div>
                        <CardTitle className="text-base">{error.message}</CardTitle>
                        <CardDescription>
                          {new Date(error.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getSeverityColor(error.severity) as any}>
                        {error.severity}
                      </Badge>
                      <Badge variant="outline">{error.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                {error.details && Object.keys(error.details).length > 0 && (
                  <CardContent>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium mb-2">
                        View Details
                      </summary>
                      <pre className="bg-muted p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(error.details, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="unmatched" className="space-y-4">
          {unmatchedEmails.filter(e => !e.reviewed).length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No unmatched emails to review</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            unmatchedEmails
              .filter(e => !e.reviewed)
              .map((email) => (
                <Card key={email.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{email.subject}</CardTitle>
                        <CardDescription>
                          {email.vendor} • {new Date(email.email_date).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkReviewed(email.id)}
                      >
                        Mark Reviewed
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium mb-2">
                        View Parsed Data
                      </summary>
                      <pre className="bg-muted p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(email.parsed_data, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2" />
                  <p>No sync history found</p>
                  <p className="text-xs mt-2">Click "Sync Now" to start syncing emails</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            history.map((email) => (
              <Card key={email.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{email.subject}</CardTitle>
                      <CardDescription>
                        {new Date(email.received_date).toLocaleString()} • {email.from_address}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={email.parsing_status === 'success' ? 'default' : 'destructive'}>
                        {email.parsing_status}
                      </Badge>
                      {email.order_id && (
                        <Badge variant="outline">
                          Order: {email.order_id.substring(0, 8)}...
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {email.parsed_data && (
                  <CardContent>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium mb-2">
                        View Parsed Data
                      </summary>
                      <pre className="bg-muted p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(JSON.parse(email.parsed_data), null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
