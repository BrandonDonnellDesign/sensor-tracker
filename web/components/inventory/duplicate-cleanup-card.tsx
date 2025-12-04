'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function DuplicateCleanupCard() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleCleanup = async () => {
        if (!confirm('This will remove duplicate orders. Are you sure?')) {
            return;
        }

        try {
            setLoading(true);
            setResult(null);

            const response = await fetch('/api/inventory/cleanup-duplicates', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                setResult(data);
                toast.success(data.message);

                // Reload the page after 2 seconds to show updated list
                setTimeout(() => window.location.reload(), 2000);
            } else {
                toast.error(data.error || 'Failed to cleanup duplicates');
            }
        } catch (error) {
            console.error('Error cleaning up duplicates:', error);
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-400" />
                    Cleanup Duplicate Orders
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-slate-400 text-sm">
                    Remove duplicate orders that have the same date, supplier, and quantity.
                    This keeps only the most recent order from each duplicate group.
                </p>

                {result && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium">{result.message}</p>
                            <p className="text-sm mt-1 text-green-400/80">
                                Found {result.duplicateGroups} duplicate groups
                            </p>
                        </div>
                    </div>
                )}

                <Button
                    onClick={handleCleanup}
                    disabled={loading}
                    variant="destructive"
                    className="w-full"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cleaning up...
                        </>
                    ) : (
                        <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Duplicates
                        </>
                    )}
                </Button>

                <div className="flex items-start gap-2 text-xs text-slate-500">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                        This action cannot be undone. Make sure you want to remove duplicates before proceeding.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
