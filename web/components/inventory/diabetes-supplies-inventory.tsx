'use client';

import { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Calendar, TrendingDown, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';

const SUPPLY_CATEGORIES = {
  sensors: { label: 'CGM Sensors', icon: '📊', color: 'blue' },
  insulin: { label: 'Insulin', icon: '💉', color: 'purple' },
  test_strips: { label: 'Test Strips', icon: '🩸', color: 'red' },
  lancets: { label: 'Lancets', icon: '📌', color: 'orange' },
  pump_supplies: { label: 'Pump Supplies', icon: '⚙️', color: 'green' },
  pen_needles: { label: 'Pen Needles', icon: '🖊️', color: 'indigo' },
  syringes: { label: 'Syringes', icon: '💊', color: 'pink' },
  batteries: { label: 'Batteries', icon: '🔋', color: 'yellow' },
  adhesive: { label: 'Adhesive/Tape', icon: '📎', color: 'gray' },
  other: { label: 'Other', icon: '📦', color: 'slate' },
};

export function DiabetesSuppliesInventory() {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingSupply, setEditingSupply] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadSupplies();
    }
  }, [user]);

  const loadSupplies = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from('supplies_with_stats')
        .select('*')
        .eq('user_id', user?.id)
        .order('category', { ascending: true })
        .order('item_name', { ascending: true });

      if (error) throw error;
      setSupplies(data || []);
    } catch (error) {
      console.error('Error loading supplies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total Omnipod count (boxes * 5 + individual pods)
  const omnipodSupplies = supplies.filter(s => s.item_name?.toLowerCase().includes('omnipod'));
  const totalOmnipodPods = omnipodSupplies.reduce((total, supply) => {
    const isBox = supply.unit?.toLowerCase() === 'boxes';
    return total + (isBox ? supply.quantity * 5 : supply.quantity);
  }, 0);

  // Calculate total Dexcom G7 sensors
  const dexcomSupplies = supplies.filter(s => 
    s.item_name?.toLowerCase().includes('dexcom') || 
    s.item_name?.toLowerCase().includes('g7') ||
    s.item_name?.toLowerCase().includes('g6')
  );
  const totalDexcomSensors = dexcomSupplies.reduce((total, supply) => total + supply.quantity, 0);

  // Filter out individual Omnipod and Dexcom items and replace with combined cards
  const nonCombinedSupplies = supplies.filter(s => 
    !s.item_name?.toLowerCase().includes('omnipod') &&
    !s.item_name?.toLowerCase().includes('dexcom') &&
    !s.item_name?.toLowerCase().includes('g7') &&
    !s.item_name?.toLowerCase().includes('g6')
  );
  
  let suppliesWithCombined = [...nonCombinedSupplies];
  
  if (omnipodSupplies.length > 0) {
    suppliesWithCombined.push({ 
      id: 'omnipod-combined',
      item_name: 'Omnipods',
      category: 'pump_supplies',
      isOmnipodCombined: true,
      omnipodItems: omnipodSupplies,
      totalPods: totalOmnipodPods
    });
  }
  
  if (dexcomSupplies.length > 0) {
    suppliesWithCombined.push({ 
      id: 'dexcom-combined',
      item_name: 'Dexcom Sensors',
      category: 'sensors',
      isDexcomCombined: true,
      dexcomItems: dexcomSupplies,
      totalSensors: totalDexcomSensors
    });
  }

  const filteredSupplies = selectedCategory
    ? suppliesWithCombined.filter(s => s.category === selectedCategory)
    : suppliesWithCombined;

  const lowStockCount = supplies.filter(s => s.needs_reorder).length;
  const expiringCount = supplies.filter(s => s.expiration_status === 'expiring_soon' || s.expiration_status === 'expired').length;

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{supplies.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Expiring Soon</p>
              <p className="text-2xl font-bold text-red-600">{expiringCount}</p>
            </div>
            <Calendar className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {new Set(supplies.map(s => s.category)).size}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Filter by Category</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
          >
            📦 All
          </button>
          {Object.entries(SUPPLY_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
              title={cat.label}
            >
              <span className="block sm:hidden">{cat.icon}</span>
              <span className="hidden sm:block">
                <span className="mr-1">{cat.icon}</span>
                <span className="hidden md:inline">{cat.label}</span>
                <span className="md:hidden">{cat.label.split(' ')[0]}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add Supply Item
      </button>

      {/* Supplies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSupplies.map((supply) => {
          if (supply.isOmnipodCombined) {
            return (
              <OmnipodCombinedCard
                key={supply.id}
                omnipodItems={supply.omnipodItems}
                totalPods={supply.totalPods}
                onEdit={(item: any) => setEditingSupply(item)}
                onRefresh={loadSupplies}
              />
            );
          }
          if (supply.isDexcomCombined) {
            return (
              <DexcomCombinedCard
                key={supply.id}
                dexcomItems={supply.dexcomItems}
                totalSensors={supply.totalSensors}
                onEdit={(item: any) => setEditingSupply(item)}
                onRefresh={loadSupplies}
              />
            );
          }
          return (
            <SupplyCard
              key={supply.id}
              supply={supply}
              onEdit={() => setEditingSupply(supply)}
              onRefresh={loadSupplies}
            />
          );
        })}
      </div>

      {filteredSupplies.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
            No supplies found
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            {selectedCategory ? 'No items in this category' : 'Start tracking your diabetes supplies'}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Add Your First Item
          </button>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingSupply) && (
        <AddSupplyForm
          supply={editingSupply}
          onClose={() => {
            setShowAddForm(false);
            setEditingSupply(null);
          }}
          onSuccess={() => {
            setShowAddForm(false);
            setEditingSupply(null);
            loadSupplies();
          }}
        />
      )}
    </div>
  );
}

function DexcomCombinedCard({ dexcomItems, totalSensors, onEdit }: any) {
  const category = SUPPLY_CATEGORIES.sensors;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Dexcom Sensors</h3>
            <p className="text-xs text-gray-600 dark:text-slate-400">Combined inventory</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white/50 dark:bg-slate-800/50 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Total Available:</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalSensors} sensors</span>
          </div>
          
          <div className="space-y-1 text-xs text-gray-600 dark:text-slate-400">
            {dexcomItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center">
                <span>
                  📊 {item.item_name}: {item.quantity} {item.unit}
                  {item.expiration_date && ` (expires ${new Date(item.expiration_date).toLocaleDateString()})`}
                </span>
                <button
                  onClick={() => onEdit(item)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-slate-500 text-center">
          Each sensor lasts 10 days
        </div>
      </div>
    </div>
  );
}

function OmnipodCombinedCard({ omnipodItems, totalPods, onEdit, onRefresh }: any) {
  const supabase = createClient();
  const category = SUPPLY_CATEGORIES.pump_supplies;

  const boxItems = omnipodItems.filter((item: any) => item.unit?.toLowerCase() === 'boxes');
  const podItems = omnipodItems.filter((item: any) => item.unit?.toLowerCase() === 'pods');
  
  const handleStartPod = async () => {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Try to use an individual pod first
      let podItem = podItems[0];
      
      if (podItem && podItem.quantity > 0) {
        // Use an individual pod
        const { error } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .update({ 
            quantity: Math.max(0, podItem.quantity - 1),
            expiration_date: expiresAt.toISOString().split('T')[0]
          })
          .eq('id', podItem.id);

        if (error) throw error;
      } else if (boxItems.length > 0 && boxItems[0].quantity > 0) {
        // No individual pods, convert from a box
        const boxItem = boxItems[0];
        
        // Decrement box by 1
        const { error: boxError } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .update({ 
            quantity: Math.max(0, boxItem.quantity - 1)
          })
          .eq('id', boxItem.id);

        if (boxError) throw boxError;

        // Add or update individual pods entry (4 remaining from the box)
        if (podItem) {
          // Update existing pod item
          const { error: podError } = await (supabase as any)
            .from('diabetes_supplies_inventory')
            .update({ 
              quantity: podItem.quantity + 4,
              expiration_date: expiresAt.toISOString().split('T')[0]
            })
            .eq('id', podItem.id);

          if (podError) throw podError;
        } else {
          // Create new pod item
          const { error: createError } = await (supabase as any)
            .from('diabetes_supplies_inventory')
            .insert({
              user_id: boxItem.user_id,
              category: 'pump_supplies',
              item_name: boxItem.item_name,
              brand: boxItem.brand,
              quantity: 4,
              unit: 'pods',
              expiration_date: expiresAt.toISOString().split('T')[0],
              notes: 'Auto-created from box'
            });

          if (createError) throw createError;
        }
      } else {
        alert('No pods available. Please add boxes or individual pods first.');
        return;
      }

      onRefresh();
    } catch (error) {
      console.error('Error starting pod:', error);
      alert('Failed to start pod');
    }
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Omnipods</h3>
            <p className="text-xs text-gray-600 dark:text-slate-400">Combined inventory</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white/50 dark:bg-slate-800/50 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Total Available:</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPods} pods</span>
          </div>
          
          <div className="space-y-1 text-xs text-gray-600 dark:text-slate-400">
            {boxItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center">
                <span>📦 {item.quantity} boxes</span>
                <button
                  onClick={() => onEdit(item)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {podItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center">
                <span>
                  🔵 {item.quantity} individual pods
                  {item.expiration_date && ` (expires ${new Date(item.expiration_date).toLocaleDateString()})`}
                </span>
                <button
                  onClick={() => onEdit(item)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStartPod}
          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={totalPods === 0}
        >
          {totalPods > 0 ? 'Start Pod (3 days)' : 'Add Pods First'}
        </button>
      </div>
    </div>
  );
}

function SupplyCard({ supply, onEdit, onRefresh }: any) {
  const supabase = createClient();
  const category = SUPPLY_CATEGORIES[supply.category as keyof typeof SUPPLY_CATEGORIES];

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await (supabase as any)
        .from('diabetes_supplies_inventory')
        .delete()
        .eq('id', supply.id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting supply:', error);
      alert('Failed to delete supply');
    }
  };

  const isOmnipod = supply.item_name?.toLowerCase().includes('omnipod');
  const isPodBox = isOmnipod && supply.unit?.toLowerCase() === 'boxes';

  const handleUse = async () => {
    const quantity = prompt('How many did you use?', '1');
    if (!quantity) return;

    const used = parseInt(quantity);
    if (isNaN(used) || used <= 0) return;

    try {
      const { error } = await (supabase as any)
        .from('diabetes_supplies_inventory')
        .update({ quantity: Math.max(0, supply.quantity - used) })
        .eq('id', supply.id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error updating supply:', error);
      alert('Failed to update supply');
    }
  };

  const handleStartPod = async () => {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

      const { error } = await (supabase as any)
        .from('diabetes_supplies_inventory')
        .update({ 
          quantity: Math.max(0, supply.quantity - 1),
          expiration_date: expiresAt.toISOString().split('T')[0]
        })
        .eq('id', supply.id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error starting pod:', error);
      alert('Failed to start pod');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">{supply.item_name}</h3>
            {supply.brand && (
              <p className="text-sm text-gray-600 dark:text-slate-400">{supply.brand}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <Edit2 className="w-4 h-4 text-gray-600 dark:text-slate-400" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-400">Quantity:</span>
          <div className="text-right">
            <span className={`font-semibold ${supply.needs_reorder ? 'text-orange-600' : 'text-gray-900 dark:text-slate-100'}`}>
              {supply.quantity} {supply.unit}
            </span>
            {isOmnipod && isPodBox && (
              <p className="text-xs text-gray-500 dark:text-slate-500">
                = {supply.quantity * 5} pods
              </p>
            )}
          </div>
        </div>

        {supply.expiration_date && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-400">Expires:</span>
            <span className={`text-sm ${
              supply.expiration_status === 'expired' ? 'text-red-600 font-semibold' :
              supply.expiration_status === 'expiring_soon' ? 'text-orange-600 font-semibold' :
              'text-gray-900 dark:text-slate-100'
            }`}>
              {new Date(supply.expiration_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {supply.location && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-400">Location:</span>
            <span className="text-sm text-gray-900 dark:text-slate-100">{supply.location}</span>
          </div>
        )}

        {supply.needs_reorder && (
          <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
            <p className="text-xs text-orange-800 dark:text-orange-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Low stock - time to reorder
            </p>
          </div>
        )}

        {isOmnipod && !isPodBox ? (
          <button
            onClick={handleStartPod}
            className="w-full mt-3 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
          >
            Start Pod (3 days)
          </button>
        ) : (
          <button
            onClick={handleUse}
            className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            Use Item
          </button>
        )}
      </div>
    </div>
  );
}

function AddSupplyForm({ supply, onClose, onSuccess }: any) {
  const { user } = useAuth();
  const supabase = createClient();
  const [formData, setFormData] = useState({
    category: supply?.category || 'sensors',
    item_name: supply?.item_name || '',
    brand: supply?.brand || '',
    quantity: supply?.quantity || 0,
    unit: supply?.unit || 'units',
    expiration_date: supply?.expiration_date || '',
    lot_number: supply?.lot_number || '',
    location: supply?.location || '',
    notes: supply?.notes || '',
    reorder_threshold: supply?.reorder_threshold || '',
    cost_per_unit: supply?.cost_per_unit || '',
  });

  const isOmnipod = formData.item_name?.toLowerCase().includes('omnipod');
  const isPodBox = isOmnipod && formData.unit?.toLowerCase() === 'boxes';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        user_id: user?.id,
        quantity: parseInt(formData.quantity as any) || 0,
        reorder_threshold: formData.reorder_threshold ? parseInt(formData.reorder_threshold as any) : null,
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit as any) : null,
        expiration_date: formData.expiration_date || null,
      };

      if (supply) {
        const { error } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .update(data)
          .eq('id', supply.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .insert(data);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving supply:', error);
      alert('Failed to save supply');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">
            {supply ? 'Edit Supply' : 'Add Supply'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isOmnipod && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>💡 Omnipod Tracking:</strong> {isPodBox 
                    ? 'Track boxes of pods. Each box contains 5 pods.' 
                    : 'Track individual pods. Click "Start Pod" to automatically set a 3-day expiration.'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  required
                >
                  {Object.entries(SUPPLY_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                {formData.category === 'pump_supplies' ? (
                  <select
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    required
                  >
                    <option value="">Select pump supply...</option>
                    <option value="Omnipod 5">Omnipod 5</option>
                    <option value="Omnipod DASH">Omnipod DASH</option>
                    <option value="Omnipod Eros">Omnipod Eros</option>
                    <option value="Infusion Sets">Infusion Sets</option>
                    <option value="Reservoirs">Reservoirs</option>
                    <option value="Cartridges">Cartridges</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Unit *
                </label>
                {isOmnipod ? (
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    required
                  >
                    <option value="pods">Individual Pods</option>
                    <option value="boxes">Boxes (5 pods each)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="units, boxes, vials, etc."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Reorder Threshold
                </label>
                <input
                  type="number"
                  value={formData.reorder_threshold}
                  onChange={(e) => setFormData({ ...formData, reorder_threshold: e.target.value as any })}
                  placeholder="Alert when below this"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Expiration Date
                  {isOmnipod && !isPodBox && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                      (Auto-set when you start a pod)
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  disabled={isOmnipod && !isPodBox}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Lot Number
                </label>
                <input
                  type="text"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Fridge, cabinet, travel bag..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Cost Per Unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value as any })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {supply ? 'Update' : 'Add'} Supply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
