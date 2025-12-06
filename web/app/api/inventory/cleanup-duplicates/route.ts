import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * Clean up duplicate sensor orders
 * POST /api/inventory/cleanup-duplicates
 * 
 * Smart Merge: Finds orders from same supplier within 3 days and merges them.
 * Handles case where "Ordered" (with Order #) and "Shipped" (no Order #) appear as duplicates.
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all orders for this user
        const { data: orders, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Group orders by supplier
        const ordersBySupplier = new Map<string, any[]>();
        for (const order of orders || []) {
            // Skip orders without a supplier
            if (!order.supplier) continue;

            if (!ordersBySupplier.has(order.supplier)) {
                ordersBySupplier.set(order.supplier, []);
            }
            ordersBySupplier.get(order.supplier)!.push(order);
        }

        const duplicatesToDelete: string[] = [];
        let duplicateGroups = 0;

        // Process each supplier's orders
        for (const [supplier, supplierOrders] of ordersBySupplier.entries()) {
            // Sort by date descending
            supplierOrders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

            // Look for clusters within 3 days
            for (let i = 0; i < supplierOrders.length; i++) {
                if (duplicatesToDelete.includes(supplierOrders[i].id)) continue;

                const current = supplierOrders[i];
                const cluster = [current];
                const currentDate = new Date(current.order_date);

                // Check subsequent orders
                for (let j = i + 1; j < supplierOrders.length; j++) {
                    if (duplicatesToDelete.includes(supplierOrders[j].id)) continue;

                    const compare = supplierOrders[j];
                    const compareDate = new Date(compare.order_date);
                    const diffDays = Math.abs((currentDate.getTime() - compareDate.getTime()) / (1000 * 60 * 60 * 24));

                    // If within 3 days, consider it a potential duplicate/update
                    if (diffDays <= 3) {
                        cluster.push(compare);
                    }
                }

                if (cluster.length > 1) {
                    duplicateGroups++;

                    // Find the "Master" order
                    // 1. Has Order Number
                    // 2. Highest Quantity
                    // 3. Earliest Date (original order)
                    const sortedCluster = [...cluster].sort((a, b) => {
                        if (a.order_number && !b.order_number) return -1;
                        if (!a.order_number && b.order_number) return 1;
                        if (a.quantity !== b.quantity) return b.quantity - a.quantity;
                        return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
                    });

                    const master = sortedCluster[0];
                    const duplicates = sortedCluster.slice(1);

                    console.log(`Merging cluster of ${cluster.length} for ${supplier}. Master: ${master.id}`);

                    // Check if we need to update Master's status from duplicates
                    // e.g. Master is "Ordered", Duplicate is "Shipped"
                    let bestStatus = master.status;
                    let deliveryDate = master.actual_delivery_date;

                    const statusPriority = { 'ordered': 1, 'shipped': 2, 'delivered': 3 };

                    for (const dup of duplicates) {
                        const dupStatus = dup.status as keyof typeof statusPriority;
                        const currentBest = bestStatus as keyof typeof statusPriority;

                        if ((statusPriority[dupStatus] || 0) > (statusPriority[currentBest] || 0)) {
                            bestStatus = dup.status;
                        }
                        if (dup.actual_delivery_date) {
                            deliveryDate = dup.actual_delivery_date;
                        }
                        duplicatesToDelete.push(dup.id);
                    }

                    // Update Master if needed
                    if (bestStatus !== master.status || deliveryDate !== master.actual_delivery_date) {
                        await supabase
                            .from('orders')
                            .update({
                                status: bestStatus,
                                actual_delivery_date: deliveryDate
                            })
                            .eq('id', master.id);
                    }
                }
            }
        }

        // Delete duplicates
        if (duplicatesToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('orders')
                .delete()
                .in('id', duplicatesToDelete);

            if (deleteError) throw deleteError;
        }

        return NextResponse.json({
            success: true,
            duplicateGroups,
            ordersDeleted: duplicatesToDelete.length,
            message: `Merged ${duplicatesToDelete.length} duplicate orders into ${duplicateGroups} master orders`
        });

    } catch (error) {
        console.error('Error cleaning up duplicates:', error);
        return NextResponse.json(
            { error: 'Failed to cleanup duplicates' },
            { status: 500 }
        );
    }
}
