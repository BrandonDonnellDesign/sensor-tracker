'use client';

import { SensorInventoryManager } from '@/components/inventory/sensor-inventory-manager';
import { DiabetesSuppliesInventory } from '@/components/inventory/diabetes-supplies-inventory';
import { PendingOrdersList } from '@/components/inventory/pending-orders-list';
import { Package, Activity } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
            <Package className="w-8 h-8" />
            Supplies & Inventory
          </h1>
          <p className="text-slate-400">
            Track your sensor supply and diabetes supplies - never run out
          </p>
        </div>

        {/* Sensor Inventory Section */}
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2 mb-4">
            <Activity className="w-6 h-6 text-blue-400" />
            Sensor Inventory
          </h2>
          <SensorInventoryManager />
        </div>

        {/* Pending Orders Section */}
        <PendingOrdersList onOrderUpdated={() => window.location.reload()} />

        {/* Diabetes Supplies Section */}
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2 mb-4">
            <Package className="w-6 h-6 text-blue-400" />
            Diabetes Supplies
          </h2>
          <DiabetesSuppliesInventory />
        </div>
      </div>
    </div>
  );
}
