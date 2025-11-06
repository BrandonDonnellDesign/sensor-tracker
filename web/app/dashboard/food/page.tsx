'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { FoodSearch } from '@/components/food/food-search';
import { FoodLogList } from '@/components/food/food-log-list';
import { UtensilsCrossed, Plus } from 'lucide-react';

export default function FoodPage() {
  const { user } = useAuth();
  const [showLogForm, setShowLogForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFoodLogged = () => {
    setShowLogForm(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2 text-white flex items-center gap-3">
              <UtensilsCrossed className="w-6 lg:w-8 h-6 lg:h-8" />
              <span className="hidden sm:inline">Smart Food + Insulin Log</span>
              <span className="sm:hidden">Food Log</span>
            </h1>
            <p className="text-slate-400 text-sm lg:text-base">
              Track meals with automatic insulin calculation and dosing
            </p>
          </div>
          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all inline-flex items-center shadow-lg font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Log Food</span>
            <span className="sm:hidden">Add Food</span>
          </button>
        </div>
      </div>

      {/* Log Food Form */}
      {showLogForm && (
        <div className="mb-4 lg:mb-6 bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 p-4 lg:p-6">
          <FoodSearch onFoodLogged={handleFoodLogged} />
        </div>
      )}

      {/* Food Log History */}
      {user?.id && <FoodLogList key={refreshKey} userId={user.id} />}
    </div>
  );
}
