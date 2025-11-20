'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, Package, AlertTriangle, Calendar, TrendingDown, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';

const SUPPLY_CATEGORIES = {
  insulin: { label: 'Insulin', icon: '💉', color: 'purple' },
  test_strips: { label: 'Test Strips', icon: '🩸', color: 'red' },
  lancets: { label: 'Lancets', icon: '🔬', color: 'orange' },
  pump_supplies: { label: 'Pump Supplies', icon: '⚙️', color: 'green' },
  pen_needles: { label: 'Pen Needles', icon: '✏️', color: 'indigo' },
  syringes: { label: 'Syringes', icon: '💉', color: 'pink' },
  batteries: { label: 'Batteries', icon: '🔋', color: 'yellow' },
  adhesive: { label: 'Adhesive/Tape', icon: '🩹', color: 'gray' },
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
  // Exclude patches - only combine actual pods
  const omnipodSupplies = supplies.filter(s => {
    const name = s.item_name?.toLowerCase();
    return name?.includes('omnipod') && !name?.includes('patch') && !name?.includes('adhesive');
  });
  const totalOmnipodPods = omnipodSupplies.reduce((total, supply) => {
    const unit = supply.unit?.toLowerCase();
    const isBox = unit === 'boxes' || unit === 'box';
    // Only count boxes and pods in the total
    if (isBox || unit === 'pods' || unit === 'pod') {
      return total + (isBox ? supply.quantity * 5 : supply.quantity);
    }
    return total;
  }, 0);

  // Filter out Omnipod pod items (but keep patches as separate cards)
  const nonOmnipodSupplies = supplies.filter(s => {
    const name = s.item_name?.toLowerCase();
    if (!name?.includes('omnipod')) return true;
    // Keep patches/adhesive as separate items
    return name?.includes('patch') || name?.includes('adhesive');
  });
  
  let suppliesWithCombined = [...nonOmnipodSupplies];
  
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
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Total Items</span>
          </div>
          <div className="text-2xl font-bold text-white">{supplies.length}</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-slate-400">Low Stock</span>
          </div>
          <div className="text-2xl font-bold text-white">{lowStockCount}</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-red-400" />
            <span className="text-sm text-slate-400">Expiring Soon</span>
          </div>
          <div className="text-2xl font-bold text-white">{expiringCount}</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">Categories</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {new Set(supplies.map(s => s.category)).size}
          </div>
        </div>
      </div>

      {/* Category Filter & Add Button */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 w-full">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600'
              }`}
            >
              📦 All
            </button>
            {Object.entries(SUPPLY_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600'
                }`}
                title={cat.label}
              >
                <span className="mr-1.5">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full lg:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/30 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Supply
        </button>
      </div>



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
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 overflow-hidden">
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No supplies found
            </h3>
            <p className="text-slate-400 mb-4">
              {selectedCategory ? 'No items in this category' : 'Start tracking your diabetes supplies'}
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/30 transition-all"
            >
              Add Your First Item
            </button>
          </div>
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

// DexcomCombinedCard removed - sensors are now handled in the Sensor Inventory section

function OmnipodCombinedCard({ omnipodItems, totalPods, onEdit, onRefresh }: any) {
  const supabase = createClient();
  const category = SUPPLY_CATEGORIES.pump_supplies;

  const boxItems = omnipodItems.filter((item: any) => {
    const unit = item.unit?.toLowerCase();
    return unit === 'boxes' || unit === 'box';
  });
  const podItems = omnipodItems.filter((item: any) => {
    const unit = item.unit?.toLowerCase();
    return unit === 'pods' || unit === 'pod';
  });
  const otherItems = omnipodItems.filter((item: any) => {
    const unit = item.unit?.toLowerCase();
    return unit !== 'boxes' && unit !== 'box' && unit !== 'pods' && unit !== 'pod';
  });
  
  const handleStartPod = async () => {
    try {
      // Try to use an individual pod first
      let podItem = podItems[0];
      
      if (podItem && podItem.quantity > 0) {
        // Use an individual pod - just decrement quantity
        const { error } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .update({ 
            quantity: Math.max(0, podItem.quantity - 1)
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
          // Update existing pod item - just add 4 more pods
          const { error: podError } = await (supabase as any)
            .from('diabetes_supplies_inventory')
            .update({ 
              quantity: podItem.quantity + 4
            })
            .eq('id', podItem.id);

          if (podError) throw podError;
        } else {
          // Create new pod item with 4 remaining
          const { error: createError } = await (supabase as any)
            .from('diabetes_supplies_inventory')
            .insert({
              user_id: boxItem.user_id,
              category: 'pump_supplies',
              item_name: boxItem.item_name,
              brand: boxItem.brand,
              quantity: 4,
              unit: 'pods',
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
    <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4 hover:bg-slate-700/20 transition-colors flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h3 className="font-semibold text-slate-100">Omnipods</h3>
            <p className="text-xs text-slate-400">Combined inventory</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 flex-1 flex flex-col">
        <div className="bg-slate-700/30 rounded p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Total Available:</span>
            <span className="text-2xl font-bold text-green-400">{totalPods} pods</span>
          </div>
          
          <div className="space-y-2 text-xs text-slate-400">
            {boxItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center gap-2">
                <span>📦 {item.quantity} boxes</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await (supabase as any)
                          .from('diabetes_supplies_inventory')
                          .update({ quantity: Math.max(0, item.quantity - 1) })
                          .eq('id', item.id);
                        if (error) throw error;
                        onRefresh();
                      } catch (error) {
                        console.error('Error updating quantity:', error);
                      }
                    }}
                    disabled={item.quantity === 0}
                    className="p-1 bg-slate-700 hover:bg-slate-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await (supabase as any)
                          .from('diabetes_supplies_inventory')
                          .update({ quantity: item.quantity + 1 })
                          .eq('id', item.id);
                        if (error) throw error;
                        onRefresh();
                      } catch (error) {
                        console.error('Error updating quantity:', error);
                      }
                    }}
                    className="p-1 bg-slate-700 hover:bg-slate-600 text-white rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {podItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center gap-2">
                <span className="flex-1">
                  🔵 {item.quantity} individual pods
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await (supabase as any)
                          .from('diabetes_supplies_inventory')
                          .update({ quantity: Math.max(0, item.quantity - 1) })
                          .eq('id', item.id);
                        if (error) throw error;
                        onRefresh();
                      } catch (error) {
                        console.error('Error updating quantity:', error);
                      }
                    }}
                    disabled={item.quantity === 0}
                    className="p-1 bg-slate-700 hover:bg-slate-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await (supabase as any)
                          .from('diabetes_supplies_inventory')
                          .update({ quantity: item.quantity + 1 })
                          .eq('id', item.id);
                        if (error) throw error;
                        onRefresh();
                      } catch (error) {
                        console.error('Error updating quantity:', error);
                      }
                    }}
                    className="p-1 bg-slate-700 hover:bg-slate-600 text-white rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {otherItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center gap-2 bg-yellow-900/20 p-2 rounded border border-yellow-700/30">
                <span className="flex-1 text-yellow-400">
                  ⚠️ {item.quantity} {item.unit} (needs fixing)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1 text-yellow-400 hover:text-yellow-300"
                    title="Edit to change unit to 'pods' or 'boxes'"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStartPod}
          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-auto"
          disabled={totalPods === 0}
        >
          {totalPods > 0 ? 'Use 1 Pod' : 'Add Pods First'}
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

  return (
    <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4 hover:bg-slate-700/20 transition-colors flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h4 className="font-semibold text-slate-100">{supply.item_name}</h4>
            {supply.brand && (
              <p className="text-xs text-slate-400">{supply.brand}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {supply.needs_reorder && (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-slate-600 rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 hover:bg-slate-600 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      <div className="space-y-3 flex-1 flex flex-col">
        <div className="bg-slate-700/30 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Quantity:</span>
            <span className={`text-xl font-bold ${supply.needs_reorder ? 'text-orange-400' : 'text-slate-100'}`}>
              {supply.quantity} {supply.unit}
            </span>
          </div>

          {isOmnipod && isPodBox && (
            <p className="text-xs text-slate-400 mb-2">
              = {supply.quantity * 5} pods total
            </p>
          )}

          <div className="flex gap-1 justify-end">
            <button
              onClick={async () => {
                try {
                  const { error } = await (supabase as any)
                    .from('diabetes_supplies_inventory')
                    .update({ quantity: Math.max(0, supply.quantity - 1) })
                    .eq('id', supply.id);
                  if (error) throw error;
                  onRefresh();
                } catch (error) {
                  console.error('Error updating quantity:', error);
                }
              }}
              disabled={supply.quantity === 0}
              className="p-1 bg-slate-700 hover:bg-slate-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={async () => {
                try {
                  const { error } = await (supabase as any)
                    .from('diabetes_supplies_inventory')
                    .update({ quantity: supply.quantity + 1 })
                    .eq('id', supply.id);
                  if (error) throw error;
                  onRefresh();
                } catch (error) {
                  console.error('Error updating quantity:', error);
                }
              }}
              className="p-1 bg-slate-700 hover:bg-slate-600 text-white rounded"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {supply.location && (
            <p className="text-xs text-slate-400 mt-2">📍 {supply.location}</p>
          )}
        </div>

        <button
          onClick={async () => {
            try {
              const { error } = await (supabase as any)
                .from('diabetes_supplies_inventory')
                .update({ quantity: Math.max(0, supply.quantity - 1) })
                .eq('id', supply.id);
              if (error) throw error;
              onRefresh();
            } catch (error) {
              console.error('Error using item:', error);
            }
          }}
          disabled={supply.quantity === 0}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-auto"
        >
          {supply.quantity > 0 ? 'Use 1' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}

function AddSupplyForm({ supply, onClose, onSuccess }: any) {
  const { user } = useAuth();
  const supabase = createClient();
  const [formData, setFormData] = useState({
    category: supply?.category || 'insulin',
    item_name: supply?.item_name || '',
    brand: supply?.brand || '',
    quantity: supply?.quantity || 0,
    unit: supply?.unit || 'units',
    lot_number: supply?.lot_number || '',
    location: supply?.location || '',
    notes: supply?.notes || '',
    reorder_threshold: supply?.reorder_threshold || '',
    cost_per_unit: supply?.cost_per_unit || '',
  });

  const itemName = formData.item_name?.toLowerCase();
  const isOmnipod = itemName?.includes('omnipod') && !itemName?.includes('patch') && !itemName?.includes('adhesive');
  const isPodBox = isOmnipod && formData.unit?.toLowerCase() === 'boxes';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const quantityToAdd = parseInt(formData.quantity as any) || 0;
      
      const data = {
        ...formData,
        user_id: user?.id,
        quantity: quantityToAdd,
        reorder_threshold: formData.reorder_threshold ? parseInt(formData.reorder_threshold as any) : null,
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit as any) : null,
      };

      if (supply) {
        // Editing existing item - just update it
        const { error } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .update(data)
          .eq('id', supply.id);
        if (error) throw error;
      } else {
        // Adding new item - check if it already exists
        const { data: existing, error: searchError } = await (supabase as any)
          .from('diabetes_supplies_inventory')
          .select('*')
          .eq('user_id', user?.id)
          .eq('category', formData.category)
          .eq('item_name', formData.item_name)
          .eq('brand', formData.brand || '')
          .eq('unit', formData.unit)
          .maybeSingle();

        if (searchError) throw searchError;

        if (existing) {
          // Item exists - increment quantity
          const { error } = await (supabase as any)
            .from('diabetes_supplies_inventory')
            .update({ 
              quantity: existing.quantity + quantityToAdd,
              // Update other fields too
              lot_number: formData.lot_number || existing.lot_number,
              location: formData.location || existing.location,
              notes: formData.notes || existing.notes,
              reorder_threshold: data.reorder_threshold ?? existing.reorder_threshold,
              cost_per_unit: data.cost_per_unit ?? existing.cost_per_unit,
            })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          // Item doesn't exist - create new
          const { error } = await (supabase as any)
            .from('diabetes_supplies_inventory')
            .insert(data);
          if (error) throw error;
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving supply:', error);
      alert('Failed to save supply');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800/50 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4">
            {supply ? 'Edit Supply' : 'Add Supply'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isOmnipod && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>💡 Omnipod Tracking:</strong> {isPodBox 
                    ? 'Track boxes of pods. Each box contains 5 pods.' 
                    : 'Track individual pods.'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
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
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Item Name *
                </label>
                {formData.category === 'pump_supplies' ? (
                  <select
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Unit *
                </label>
                {isOmnipod ? (
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Reorder Threshold
                </label>
                <input
                  type="number"
                  value={formData.reorder_threshold}
                  onChange={(e) => setFormData({ ...formData, reorder_threshold: e.target.value as any })}
                  placeholder="Alert when below this"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Lot Number
                </label>
                <input
                  type="text"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Fridge, cabinet, travel bag..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Cost Per Unit
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value as any })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100"
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
