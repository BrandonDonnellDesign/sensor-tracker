'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Minus, AlertTriangle, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AddInventoryDialog } from './add-inventory-dialog';
import type { SensorInventory, InventoryStats } from '@/types/inventory';

export function SensorInventoryManager() {
  const [inventory, setInventory] = useState<SensorInventory[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory');
      const data = await response.json();

      if (data.success) {
        setInventory(data.inventory);
        setStats(data.stats);
      } else {
        toast.error('Failed to load inventory');
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (id: string, change: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity + change);

    try {
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: newQuantity })
      });

      const data = await response.json();

      if (data.success) {
        await loadInventory();
        toast.success('Inventory updated');
      } else {
        toast.error('Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
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

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-400">Total Sensors</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalQuantity}</div>
            {stats.lowStock && (
              <Badge variant="destructive" className="mt-2">Low Stock</Badge>
            )}
          </div>

          <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-slate-400">Usage Rate</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.usageRate}</div>
            <span className="text-xs text-slate-400">per month</span>
          </div>

          <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-400">Days Remaining</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.daysUntilEmpty > 365 ? '365+' : stats.daysUntilEmpty}
            </div>
            <span className="text-xs text-slate-400">days</span>
          </div>

          <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-slate-400">Reorder By</span>
            </div>
            <div className="text-sm font-medium text-white">
              {new Date(stats.recommendedReorderDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Inventory List */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 overflow-hidden">
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sensor Inventory
          </h3>
          {inventory.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sensors
            </Button>
          )}
        </div>

        {inventory.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">No inventory tracked yet</p>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sensors
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {inventory.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-white">
                      {item.sensorModel?.manufacturer} {item.sensorModel?.model_name}
                    </h4>
                    {item.location && (
                      <p className="text-sm text-slate-400 mt-1">
                        Location: {item.location}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-slate-400 mt-1">{item.notes}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Last updated: {new Date(item.last_updated).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{item.quantity}</div>
                      <div className="text-xs text-slate-400">in stock</div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity === 0}
                        className="border-slate-600"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="border-slate-600"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Inventory Dialog */}
      <AddInventoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadInventory}
      />
    </div>
  );
}
