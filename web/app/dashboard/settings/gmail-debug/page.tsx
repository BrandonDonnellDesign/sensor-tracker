'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function GmailDebugPage() {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

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

    const handleSync = async () => {
        try {
            setLoading(true);
            setError(null);
            setResults(null);

            const response = await fetch('/api/gmail/sync', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                setResults(data);
                loadHistory(); // Refresh history
            } else {
                setError(data.error || 'Failed to sync');
            }
        } catch (err) {
            setError('An error occurred while syncing');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gmail Integration Debugger</h1>
                    <p className="text-slate-400">Test email parsing and view history</p>
                </div>
                <Button onClick={handleSync} disabled={loading}>
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Syncing...' : 'Run Sync & Debug'}
                </Button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center">
                    <XCircle className="h-5 w-5 mr-2" />
                    {error}
                </div>
            )}

            {results && (
                <div className="space-y-6">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                                Sync Complete
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300">{results.message}</p>
                            <p className="text-sm text-slate-400 mt-2">
                                Found {results.totalFound || results.emails?.length || 0} emails matching criteria.
                            </p>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-white">Current Sync Results</h2>
                        {results.results?.length === 0 ? (
                            <p className="text-slate-400 italic">No successfully parsed emails in this sync.</p>
                        ) : (
                            results.results?.map((email: any, index: number) => (
                                <Card key={index} className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-medium text-white text-lg">{email.subject}</h3>
                                                <div className="text-sm text-slate-400 mt-1 space-y-0.5">
                                                    <p className="font-mono">ID: {email.id}</p>
                                                    <p>From: <span className="text-slate-300">{email.from}</span></p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {email.action?.action === 'skipped' ? (
                                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                        Skipped (Exists)
                                                    </Badge>
                                                ) : email.status === 'success' ? (
                                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                                        Success
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                                        Failed Parsing
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-slate-900/50 p-3 rounded-lg">
                                                <span className="text-slate-500 block mb-1">Action Taken</span>
                                                <span className="text-white font-medium capitalize">
                                                    {email.action?.action || 'None'}
                                                </span>
                                                {email.action?.reason && (
                                                    <span className="text-slate-400 block text-xs mt-1">
                                                        ({email.action.reason})
                                                    </span>
                                                )}
                                            </div>
                                            {email.action?.orderId && (
                                                <div className="bg-slate-900/50 p-3 rounded-lg">
                                                    <span className="text-slate-500 block mb-1">Order ID</span>
                                                    <span className="text-blue-400 font-mono text-xs">
                                                        {email.action.orderId}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4">
                                            <details className="text-xs text-slate-500 cursor-pointer">
                                                <summary className="hover:text-slate-400">View Raw Body Snippet</summary>
                                                <pre className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                                                    {email.snippet || 'No snippet available'}
                                                </pre>
                                            </details>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    {results.unparsed && results.unparsed.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-yellow-500" />
                                Unparsed Emails ({results.unparsed.length})
                            </h2>
                            {results.unparsed.map((email: any, index: number) => (
                                <Card key={index} className="bg-slate-800/50 border-yellow-500/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-medium text-white text-lg">{email.subject}</h3>
                                                <div className="text-sm text-slate-400 mt-1 space-y-0.5">
                                                    <p className="font-mono">ID: {email.id}</p>
                                                    <p>From: <span className="text-slate-300">{email.from}</span></p>
                                                    <p>Date: {new Date(email.date).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                                Unparsed
                                            </Badge>
                                        </div>

                                        <div className="mt-4">
                                            <details className="text-xs text-slate-500 cursor-pointer">
                                                <summary className="hover:text-slate-400">View Raw Body Snippet</summary>
                                                <pre className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                                                    {email.snippet || 'No snippet available'}
                                                </pre>
                                            </details>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Database History (Last 20)</h2>
                {history.length === 0 ? (
                    <p className="text-slate-400 italic">No history found.</p>
                ) : (
                    <div className="grid gap-4">
                        {history.map((email) => (
                            <Card key={email.id} className="bg-slate-800/50 border-slate-700/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-white">{email.subject}</h3>
                                            <div className="flex gap-4 mt-1 text-sm text-slate-400">
                                                <span>{new Date(email.received_date).toLocaleDateString()}</span>
                                                <span>{email.from_address}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge
                                                variant={email.parsing_status === 'success' ? 'default' : 'destructive'}
                                                className={email.parsing_status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}
                                            >
                                                {email.parsing_status}
                                            </Badge>
                                            {email.order_id && (
                                                <span className="text-xs font-mono text-blue-400">
                                                    Order: {email.order_id.substring(0, 8)}...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
