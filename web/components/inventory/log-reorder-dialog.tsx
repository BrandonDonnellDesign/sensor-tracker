'use client';

import { useState, Dispatch, SetStateAction } from 'react';
import { Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface LogReorderDialogProps {
    open: boolean;
    onOpenChange: Dispatch<SetStateAction<boolean>>;
    onSuccess: () => void;
    sensorModelId?: string | undefined;
}

export function LogReorderDialog({
    open,
    onOpenChange,
    onSuccess,
    sensorModelId,
}: LogReorderDialogProps) {
    const [loading, setLoading] = useState(false);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [supplier, setSupplier] = useState('');
    const [status, setStatus] = useState<'pending' | 'shipped' | 'delivered'>('pending');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!quantity || parseInt(quantity) <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        try {
            setLoading(true);

            // First, create the order
            const orderResponse = await fetch('/api/inventory/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_date: orderDate,
                    quantity: parseInt(quantity),
                    order_number: orderNumber || null,
                    supplier: supplier || null,
                    sensor_model_id: sensorModelId,
                    status: status,
                    actual_delivery_date: status === 'delivered' ? orderDate : null,
                }),
            });

            const orderData = await orderResponse.json();

            if (!orderData.success) {
                toast.error(orderData.error || 'Failed to log reorder');
                return;
            }

            // If status is delivered, add to inventory
            if (status === 'delivered' && sensorModelId) {
                const inventoryResponse = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sensor_model_id: sensorModelId,
                        quantity: parseInt(quantity),
                        notes: `Added from order ${orderNumber || orderData.order.id}`,
                    }),
                });

                const inventoryData = await inventoryResponse.json();

                if (!inventoryData.success) {
                    toast.warning('Order logged but failed to update inventory');
                } else {
                    toast.success('Order logged and inventory updated');
                }
            } else {
                toast.success(`Order logged as ${status}`);
            }

            onSuccess();
            onOpenChange(false);

            // Reset form
            setOrderDate(new Date().toISOString().split('T')[0]);
            setQuantity('');
            setOrderNumber('');
            setSupplier('');
            setStatus('pending');
        } catch (error) {
            console.error('Error logging reorder:', error);
            toast.error('Failed to log reorder');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Package className="h-5 w-5 text-blue-400" />
                        Log Sensor Reorder
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                        Record when you ordered sensors. Choose status to control inventory.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Order Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="order-date" className="flex items-center gap-2 text-slate-200">
                                <Calendar className="h-4 w-4 text-blue-400" />
                                Order Date
                            </Label>
                            <Input
                                id="order-date"
                                type="date"
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                                required
                                max={new Date().toISOString().split('T')[0]}
                                className="bg-slate-800 border-slate-600 text-white"
                            />
                        </div>

                        {/* Quantity */}
                        <div className="grid gap-2">
                            <Label htmlFor="quantity" className="text-slate-200">
                                Quantity Ordered <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                placeholder="e.g., 3"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>

                        {/* Order Status */}
                        <div className="grid gap-2">
                            <Label htmlFor="status" className="text-slate-200">
                                Order Status <span className="text-red-400">*</span>
                            </Label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'pending' | 'shipped' | 'delivered')}
                                className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                required
                            >
                                <option value="pending">Pending (Not yet shipped)</option>
                                <option value="shipped">Shipped (In transit)</option>
                                <option value="delivered">Delivered (Add to inventory)</option>
                            </select>
                            <p className="text-xs text-slate-400">
                                {status === 'delivered'
                                    ? '✓ Will be added to your inventory'
                                    : '⏳ Will NOT be added to inventory until delivered'}
                            </p>
                        </div>

                        {/* Order Number (Optional) */}
                        <div className="grid gap-2">
                            <Label htmlFor="order-number" className="text-slate-200">Order Number (Optional)</Label>
                            <Input
                                id="order-number"
                                type="text"
                                placeholder="e.g., ORD-12345"
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>

                        {/* Supplier (Optional) */}
                        <div className="grid gap-2">
                            <Label htmlFor="supplier" className="text-slate-200">Supplier (Optional)</Label>
                            <Input
                                id="supplier"
                                type="text"
                                placeholder="e.g., Dexcom, Pharmacy"
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                            className="border-slate-600 text-slate-200 hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {loading ? 'Saving...' : 'Log Reorder'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
