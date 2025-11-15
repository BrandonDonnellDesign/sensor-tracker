'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useSearchParams } from 'next/navigation';
import { FoodSearch } from '@/components/food/food-search';
import { FoodLogList } from '@/components/food/food-log-list';
import { MealImpactAnalyzer } from '@/components/food/meal-impact-analyzer';
import { MealTemplateBrowser } from '@/components/meal-templates/meal-template-browser';
import { CreateTemplateDialog } from '@/components/meal-templates/create-template-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase-client';
import { UtensilsCrossed, Plus, History, BarChart3, Activity, Target, TrendingUp, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { MealTemplate } from '@/types/meal-templates';

interface FoodLog {
  id: string;
  logged_at: string;
  product_name?: string | null;
  custom_food_name?: string | null;
  total_carbs_g?: number | null;
  total_calories?: number | null;
  meal_type?: string | null;
  created_at: string;
  food_items?: {
    product_name?: string | null | undefined;
    brand?: string | null | undefined;
  } | null;
}

interface InsulinLog {
  id: string;
  taken_at: string;
  units: number;
  insulin_type: string;
  delivery_type?: string;
  user_id: string;
}

interface GlucoseReading {
  id: string;
  system_time: string;
  value: number;
  trend?: string | null;
}

export default function FoodPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [showLogForm, setShowLogForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('history');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateRefreshKey, setTemplateRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [insulinLogs, setInsulinLogs] = useState<InsulinLog[]>([]);
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
  const [_currentGlucose, setCurrentGlucose] = useState<number | null>(null);
  const [carbRatio, setCarbRatio] = useState<number | null>(null);

  const supabase = createClient();

  // Handle tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['log', 'history', 'analytics', 'templates'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTemplateSelected = (template: MealTemplate) => {
    toast.success(`Selected: ${template.name}`);
    // TODO: Pre-fill food logger with template items
    setActiveTab('log');
  };

  const handleTemplateCreated = () => {
    setTemplateRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
      loadSettings();
    }
  }, [user, refreshKey]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('user_calculator_settings' as any)
        .select('insulin_to_carb')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const settings = data as any;
        if (settings.insulin_to_carb) {
          setCarbRatio(parseFloat(settings.insulin_to_carb));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [foodResponse, insulinResponse, glucoseResponse] = await Promise.all([
        supabase
          .from('food_logs')
          .select(`
            *,
            food_items (
              product_name,
              brand
            )
          `)
          .eq('user_id', user.id)
          .gte('logged_at', thirtyDaysAgo.toISOString())
          .order('logged_at', { ascending: false }),
        
        supabase
          .from('insulin_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('taken_at', thirtyDaysAgo.toISOString())
          .order('taken_at', { ascending: false }),
        
        supabase
          .from('glucose_readings')
          .select('*')
          .eq('user_id', user.id)
          .gte('system_time', thirtyDaysAgo.toISOString())
          .order('system_time', { ascending: false })
          .limit(100)
      ]);

      if (foodResponse.data) setFoodLogs(foodResponse.data);
      if (insulinResponse.data) setInsulinLogs(insulinResponse.data);
      if (glucoseResponse.data) {
        setGlucoseReadings(glucoseResponse.data);
        if (glucoseResponse.data.length > 0) {
          setCurrentGlucose(glucoseResponse.data[0].value);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFoodLogged = () => {
    setShowLogForm(false);
    setRefreshKey(prev => prev + 1);
    setActiveTab('history'); // Switch back to history tab after logging
  };

  // Calculate today's statistics
  const todayStats = {
    totalCarbs: foodLogs
      .filter(log => {
        const logDate = new Date(log.logged_at);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
      })
      .reduce((sum, log) => sum + (log.total_carbs_g || 0), 0),
    
    totalInsulin: insulinLogs
      .filter(log => {
        const logDate = new Date(log.taken_at);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
      })
      .reduce((sum, log) => sum + log.units, 0),
    
    mealsToday: foodLogs.filter(log => {
      const logDate = new Date(log.logged_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length
  };

  // Use configured carb ratio from settings
  const displayCarbRatio = carbRatio;

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2 text-white flex items-center gap-3">
              <UtensilsCrossed className="w-6 lg:w-8 h-6 lg:h-8" />
              <span className="hidden sm:inline">Food & Meal Management</span>
              <span className="sm:hidden">Food Log</span>
            </h1>
            <p className="text-slate-400 text-sm lg:text-base">
              Track meals, analyze impact, and optimize insulin dosing
            </p>
          </div>
          <button
            onClick={() => {
              setShowLogForm(!showLogForm);
              setActiveTab('log');
            }}
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all inline-flex items-center shadow-lg font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Log Food</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Meals Today</span>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-white">{todayStats.mealsToday}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Total Carbs</span>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-white">{todayStats.totalCarbs.toFixed(0)}g</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400">Total Insulin</span>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-white">{todayStats.totalInsulin.toFixed(1)}u</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-400">Carb Ratio</span>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-white">
              {displayCarbRatio ? `1:${displayCarbRatio}` : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="log" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Log Food</span>
            <span className="sm:hidden">Log</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <div className="bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 p-4 lg:p-6">
            <FoodSearch onFoodLogged={handleFoodLogged} />
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 p-4 lg:p-6">
            <MealTemplateBrowser
              key={templateRefreshKey}
              onSelectTemplate={handleTemplateSelected}
              onCreateNew={() => setShowCreateTemplate(true)}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {user?.id && <FoodLogList key={refreshKey} userId={user.id} />}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {!loading && (
            <MealImpactAnalyzer
              foodLogs={foodLogs}
              insulinLogs={insulinLogs}
              glucoseReadings={glucoseReadings}
            />
          )}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateTemplate}
        onOpenChange={setShowCreateTemplate}
        onSuccess={handleTemplateCreated}
      />
    </div>
  );
}
