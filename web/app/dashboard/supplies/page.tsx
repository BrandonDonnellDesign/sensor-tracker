import { DiabetesSuppliesInventory } from '@/components/inventory/diabetes-supplies-inventory';
import { Package } from 'lucide-react';

export default function SuppliesPage() {
  return (
    <div className="space-y-6">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Package className="w-6 lg:w-8 h-6 lg:h-8 text-blue-600" />
          Diabetes Supplies Inventory
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm lg:text-base">
          Track all your diabetes supplies in one place
        </p>
      </div>
      
      <DiabetesSuppliesInventory />
    </div>
  );
}

export const metadata = {
  title: 'Supplies Inventory - CGM Sensor Tracker',
  description: 'Track your diabetes supplies inventory',
};
