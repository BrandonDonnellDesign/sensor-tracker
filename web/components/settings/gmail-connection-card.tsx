'use client';

import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Unlink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface EmailConnection {
    id: string;
    email_address: string;
    last_sync: string | null;
    sync_enabled: boolean;
    created_at: string;
}

export function GmailConnectionCard() {
    const [connection, setConnection] = useState<EmailConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadConnection();
    }, []);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await fetch('/api/gmail/sync', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Sync completed successfully');
                loadConnection(); // Reload to update last sync time
            } else {
                toast.error(data.error || 'Failed to sync emails');
            }
        } catch (error) {
            console.error('Error syncing Gmail:', error);
            toast.error('Failed to sync emails');
        } finally {
            setSyncing(false);
        }
    };

    const loadConnection = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/gmail/status');
            const data = await response.json();

            if (data.success && data.connection) {
                setConnection(data.connection);
            } else {
                setConnection(null);
            }
        } catch (error) {
            console.error('Error loading Gmail connection:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setConnecting(true);
            const response = await fetch('/api/gmail/connect');
            const data = await response.json();

            if (data.success && data.authUrl) {
                // Redirect to Google OAuth
                window.location.href = data.authUrl;
            } else {
                toast.error('Failed to initiate Gmail connection');
            }
        } catch (error) {
            console.error('Error connecting Gmail:', error);
            toast.error('Failed to connect Gmail');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Gmail? This will stop automatic order email syncing.')) {
            return;
        }

        try {
            setDisconnecting(true);
            const response = await fetch('/api/gmail/disconnect', {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Gmail disconnected successfully');
                setConnection(null);
            } else {
                toast.error('Failed to disconnect Gmail');
            }
        } catch (error) {
            console.error('Error disconnecting Gmail:', error);
            toast.error('Failed to disconnect Gmail');
        } finally {
            setDisconnecting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                    <div className="h-20 bg-slate-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Mail className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Gmail Connection</h3>
                            <p className="text-sm text-slate-400">
                                Automatically sync sensor orders from your email
                            </p>
                        </div>
                    </div>

                    {connection ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Connected
                        </Badge>
                    ) : (
                        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Not Connected
                        </Badge>
                    )}
                </div>

                {connection ? (
                    <div className="space-y-4">
                        <div className="bg-slate-700/30 rounded-lg p-4">
                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Email:</span>
                                    <span className="text-white font-medium">{connection.email_address}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Connected:</span>
                                    <span className="text-white">
                                        {new Date(connection.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {connection.last_sync && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Last Sync:</span>
                                        <span className="text-white">
                                            {new Date(connection.last_sync).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSync}
                                disabled={syncing}
                                className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="border-red-600 text-red-400 hover:bg-red-600/10"
                            >
                                <Unlink className="h-4 w-4 mr-2" />
                                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-300">
                            Connect your Gmail account to automatically detect and import sensor orders from:
                        </p>
                        <ul className="text-sm text-slate-400 space-y-1 ml-4">
                            <li>• Amazon Pharmacy</li>
                            <li>• Dexcom</li>
                            <li>• CVS</li>
                            <li>• Walgreens</li>
                        </ul>

                        <Button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Mail className="h-4 w-4 mr-2" />
                            {connecting ? 'Connecting...' : 'Connect Gmail'}
                        </Button>

                        <p className="text-xs text-slate-500">
                            We only request read-only access to your Gmail. Your emails are never stored.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
