import { SensorInventoryManager } from '@/components/inventory/sensor-inventory-manager';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
            <Package className="w-8 h-8" />
            Sensor Inventory
          </h1>
          <p className="text-slate-400">
            Track your sensor supply and never run out
          </p>
        </div>

        {/* Inventory Manager */}
        <SensorInventoryManager />
      </div>
    </div>
  );
}
