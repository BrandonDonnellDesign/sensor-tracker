'use client';

import { useState, useEffect } from 'react';
import { Package, Clock, Truck, CheckCircle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface SensorOrder {
    id: string;
    order_date: string;
    quantity: number;
    order_number: string | null;
    supplier: string | null;
    status: 'pending' | 'shipped' | 'delivered';
    actual_delivery_date: string | null;
    sensor_model_id: string | null;
}

interface PendingOrdersListProps {
    onOrderUpdated: () => void;
}

export function PendingOrdersList({ onOrderUpdated }: PendingOrdersListProps) {
    const [orders, setOrders] = useState<SensorOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<SensorOrder | null>(null);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [newStatus, setNewStatus] = useState<'pending' | 'shipped' | 'delivered'>('pending');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/inventory/orders');
            const data = await response.json();

            if (data.success) {
                setOrders(data.orders || []);
            } else {
                toast.error('Failed to load orders');
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder) return;

        try {
            setUpdating(true);

            const response = await fetch(`/api/inventory/orders/${selectedOrder.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    actual_delivery_date: newStatus === 'delivered' ? new Date().toISOString() : null,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Order status updated to ${newStatus}`);
                setShowUpdateDialog(false);
                setSelectedOrder(null);
                loadOrders();
                onOrderUpdated();
            } else {
                toast.error(data.error || 'Failed to update order');
            }
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error('Failed to update order');
        } finally {
            setUpdating(false);
        }
    };

    const openUpdateDialog = (order: SensorOrder) => {
        setSelectedOrder(order);
        setNewStatus(order.status);
        setShowUpdateDialog(true);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4" />;
            case 'shipped':
                return <Truck className="h-4 w-4" />;
            case 'delivered':
                return <CheckCircle className="h-4 w-4" />;
            default:
                return <Package className="h-4 w-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'shipped':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'delivered':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            default:
                return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                    <div className="h-32 bg-slate-700 rounded"></div>
                </div>
            </div>
        );
    }

    const pendingOrders = orders.filter(o => o.status !== 'delivered');

    if (pendingOrders.length === 0) {
        return null; // Don't show section if no pending orders
    }

    return (
        <>
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 overflow-hidden">
                <div className="p-4 border-b border-slate-700/30">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-400" />
                        Pending Orders ({pendingOrders.length})
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Track your sensor orders until they're delivered
                    </p>
                </div>

                <div className="divide-y divide-slate-700/30">
                    {pendingOrders.map((order) => (
                        <div key={order.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                                            {getStatusIcon(order.status)}
                                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                        </Badge>
                                        <span className="text-white font-medium">{order.quantity} sensors</span>
                                    </div>

                                    <div className="text-sm text-slate-400 space-y-1">
                                        <p>Ordered: {new Date(order.order_date).toLocaleDateString()}</p>
                                        {order.order_number && (
                                            <p>Order #: {order.order_number}</p>
                                        )}
                                        {order.supplier && (
                                            <p>Supplier: {order.supplier}</p>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openUpdateDialog(order)}
                                    className="border-slate-600 text-slate-200 hover:bg-slate-700"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Update Status
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Update Status Dialog */}
            <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">Update Order Status</DialogTitle>
                        <DialogDescription className="text-slate-300">
                            Change the status of your sensor order
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="status" className="text-slate-200">
                                New Status
                            </Label>
                            <select
                                id="status"
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as 'pending' | 'shipped' | 'delivered')}
                                className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="pending">Pending</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                            </select>
                            {newStatus === 'delivered' && (
                                <p className="text-xs text-green-400">
                                    ✓ This will add {selectedOrder?.quantity} sensors to your inventory
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowUpdateDialog(false)}
                            disabled={updating}
                            className="border-slate-600 text-slate-200 hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateStatus}
                            disabled={updating}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {updating ? 'Updating...' : 'Update Status'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
