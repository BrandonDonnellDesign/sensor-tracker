'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Minus, AlertTriangle, TrendingDown, Calendar, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AddInventoryDialog } from './add-inventory-dialog';
import { LogReorderDialog } from './log-reorder-dialog';
import type { SensorInventory, InventoryStats } from '@/types/inventory';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';

interface CombinedInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  location?: string;
  last_updated: string;
  type: 'sensor' | 'supply';
  notes?: string;
}

export function InventoryManager() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<SensorInventory[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [combinedInventory, setCombinedInventory] = useState<CombinedInventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);

  useEffect(() => {
    loadInventory();
  }, [user]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      
      // Load sensor inventory
      const sensorResponse = await fetch('/api/inventory');
      const sensorData = await sensorResponse.json();

      if (sensorData.success) {
        setInventory(sensorData.inventory);
        setStats(sensorData.stats);
      }

      // Load diabetes supplies
      if (user) {
        const supabase = createClient();
        const { data: suppliesData, error } = await (supabase as any)
          .from('supplies_with_stats')
          .select('*')
          .eq('user_id', user.id)
          .order('category', { ascending: true })
          .order('item_name', { ascending: true });

        if (!error && suppliesData) {
          setSupplies(suppliesData);
        }
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  // Combine sensor inventory and supplies into one list
  useEffect(() => {
    const combined: CombinedInventoryItem[] = [];

    // Add sensors
    inventory.forEach(item => {
      combined.push({
        id: item.id,
        name: `${item.sensorModel?.manufacturer} ${item.sensorModel?.model_name}`,
        category: 'CGM Sensor',
        quantity: item.quantity,
        unit: 'pcs',
        location: item.location || undefined,
        last_updated: item.last_updated,
        type: 'sensor',
        notes: item.notes || undefined
      });
    });

    // Add supplies
    supplies.forEach(item => {
      combined.push({
        id: item.id,
        name: item.item_name,
        category: getCategoryLabel(item.category),
        quantity: item.quantity,
        unit: item.unit,
        location: item.location || undefined,
        last_updated: item.updated_at || item.created_at,
        type: 'supply',
        notes: item.notes || undefined
      });
    });

    setCombinedInventory(combined);
  }, [inventory, supplies]);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      insulin: 'Insulin',
      test_strips: 'Test Strips',
      lancets: 'Lancets',
      pump_supplies: 'Pump Supplies',
      pen_needles: 'Pen Needles',
      syringes: 'Syringes',
      batteries: 'Batteries',
      adhesive: 'Adhesive/Tape',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const updateQuantity = async (id: string, change: number, type: 'sensor' | 'supply') => {
    const item = combinedInventory.find(i => i.id === id);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity + change);

    try {
      if (type === 'sensor') {
        const response = await fetch('/api/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, quantity: newQuantity })
        });

        const data = await response.json();
        if (!data.success) {
          toast.error('Failed to update inventory');
          return;
        }
      } else {
        // Update supply
        if (!user?.id) {
          toast.error('User not authenticated');
          return;
        }

        const supabase = createClient();
        const { error } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .update({ quantity: newQuantity })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating supply:', error);
          toast.error(`Failed to update supply: ${error.message || 'Unknown error'}`);
          return;
        }
      }

      await loadInventory();
      toast.success('Inventory updated');
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
    }
  };

  const deleteItem = async (id: string, type: 'sensor' | 'supply', name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from your inventory?`)) {
      return;
    }

    try {
      if (type === 'sensor') {
        const response = await fetch('/api/inventory', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });

        const data = await response.json();
        if (!data.success) {
          toast.error('Failed to delete item');
          return;
        }
      } else {
        // Delete supply
        if (!user?.id) {
          toast.error('User not authenticated');
          return;
        }

        const supabase = createClient();
        const { error } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting supply:', error);
          toast.error(`Failed to delete supply: ${error.message || 'Unknown error'}`);
          return;
        }
      }

      await loadInventory();
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
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

      {/* Inventory Table */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Product Inventory</h3>
            <p className="text-sm text-gray-400">These are details about all products</p>
          </div>
          {combinedInventory.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReorderDialog(true)} className="bg-gray-800 hover:bg-gray-700 border-gray-700">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Log Reorder
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)} className="bg-gray-800 hover:bg-gray-700 border-gray-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Items
              </Button>
            </div>
          )}
        </div>

        {combinedInventory.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4 text-lg">No inventory tracked yet</p>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)} className="bg-gray-800 hover:bg-gray-700 border-gray-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Items
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Product Name</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">In-Stock</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Last Restock Date</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {combinedInventory.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                      index === combinedInventory.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {item.name}
                          </div>
                          {item.notes && (
                            <div className="text-sm text-gray-400 mt-0.5">{item.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-semibold">{item.quantity} {item.unit || 'pcs'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-300">{item.location || 'Not specified'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(item.last_updated).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, -1, item.type)}
                          disabled={item.quantity === 0}
                          className="bg-gray-800 hover:bg-gray-700 border-gray-700 h-8 w-8 p-0"
                          title="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, 1, item.type)}
                          className="bg-gray-800 hover:bg-gray-700 border-gray-700 h-8 w-8 p-0"
                          title="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteItem(item.id, item.type, item.name)}
                          className="bg-red-900/20 hover:bg-red-900/40 border-red-800 text-red-400 hover:text-red-300 h-8 w-8 p-0"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Inventory Dialog */}
      <AddInventoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadInventory}
      />

      {/* Log Reorder Dialog */}
      <LogReorderDialog
        open={showReorderDialog}
        onOpenChange={setShowReorderDialog}
        onSuccess={loadInventory}
        sensorModelId={inventory[0]?.sensor_model_id || undefined}
      />
    </div>
  );
}
