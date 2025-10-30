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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
              <UtensilsCrossed className="w-8 h-8" />
              Food Log
            </h1>
            <p className="text-slate-400">
              Track your meals and nutrition
            </p>
          </div>
          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all inline-flex items-center shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Log Food
          </button>
        </div>
      </div>

      {/* Log Food Form */}
      {showLogForm && (
        <div className="mb-6 bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 p-6">
          <FoodSearch onFoodLogged={handleFoodLogged} />
        </div>
      )}

      {/* Food Log History */}
      {user?.id && <FoodLogList key={refreshKey} userId={user.id} />}
    </div>
  );
}
