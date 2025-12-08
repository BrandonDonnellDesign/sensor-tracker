'use client';

import { InventoryManager } from '@/components/inventory/inventory-manager';
import { PendingOrdersList } from '@/components/inventory/pending-orders-list';
import ReplacementTracker from '@/components/replacement-tracker';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
            <Package className="w-8 h-8" />
            Inventory
          </h1>
          <p className="text-slate-400">
            Track all your diabetes supplies - never run out
          </p>
        </div>

        {/* Unified Inventory Section */}
        <InventoryManager />

        {/* Pending Orders Section */}
        <PendingOrdersList onOrderUpdated={() => window.location.reload()} />

        {/* Replacement Tracking Section */}
        <ReplacementTracker />
      </div>
    </div>
  );
}
