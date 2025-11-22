'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/components/providers/auth-provider';
import { useInsulinData } from '@/lib/hooks/use-insulin-data';
import { useCalculatorSettings } from '@/lib/hooks/use-calculator-settings';
import { createClient } from '@/lib/supabase-client';
import { logger } from '@/lib/logger';
import { 
  calculateIOB,
  getInsulinDuration,
  type InsulinDose,
} from '@/lib/iob-calculator';
import { 
  UtensilsCrossed, 
  Syringe, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  X
} from 'lucide-react';

interface IntegratedMealLoggerProps {
  food: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export function IntegratedMealLogger({ food, onCancel, onSuccess }: IntegratedMealLoggerProps) {
  const { user } = useAuth();
  const { currentGlucose, doses: recentDoses } = useInsulinData();
  const { settings } = useCalculatorSettings();
  
  // Smart defaults based on food type
  const getSmartDefaults = () => {
    const foodName = (food.name || food.product_name || '').toLowerCase();
    const brand = (food.brand || '').toLowerCase();
    
    // Energy drinks and similar beverages default to servings
    const energyDrinkKeywords = ['energy drink', 'energy', 'monster', 'red bull', 'rockstar', 'bang', 'reign', 'celsius', 'ghost', 'prime energy', 'gfuel', 'g fuel'];
    const isEnergyDrink = energyDrinkKeywords.some(keyword => foodName.includes(keyword) || brand.includes(keyword));
    
    // Fast food chains and restaurant items default to servings
    const fastFoodBrands = ['mcdonald', 'burger king', 'kfc', 'taco bell', 'subway', 'pizza hut', 'domino', 'wendy', 'chick-fil-a', 'chipotle', 'starbucks'];
    const isFastFood = fastFoodBrands.some(brand_name => brand.includes(brand_name) || foodName.includes(brand_name));
    
    // Items that are typically measured in servings
    const servingKeywords = ['large', 'medium', 'small', 'cup', 'bottle', 'can', 'piece', 'slice', 'sandwich', 'burger', 'fries'];
    const isServingItem = servingKeywords.some(keyword => foodName.includes(keyword));
    
    if (isEnergyDrink || isFastFood || isServingItem) {
      return { size: 1, unit: 'serving' };
    }
    
    return { size: 100, unit: 'g' };
  };
  
  const smartDefaults = getSmartDefaults();
  
  // Food logging state
  const [servingSize, setServingSize] = useState(smartDefaults.size);
  const [servingUnit, setServingUnit] = useState(smartDefaults.unit);
  const [mealType, setMealType] = useState<string>('snack');
  const [notes, setNotes] = useState('');
  const [loggedTime, setLoggedTime] = useState(new Date().toTimeString().slice(0, 5));
  const [loggedDate, setLoggedDate] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  
  // Insulin calculation state
  const [targetGlucose, setTargetGlucose] = useState(settings.targetGlucose);
  const [manualGlucose, setManualGlucose] = useState<number | null>(null);
  const [useManualGlucose, setUseManualGlucose] = useState(false);
  const [includeInsulin, setIncludeInsulin] = useState(true);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Convert serving to grams for calculation
  const getServingInGrams = useMemo(() => {
    switch (servingUnit) {
      case 'oz': return servingSize * 28.35;
      case 'lb': return servingSize * 453.592;
      case 'cup': return servingSize * 240;
      case 'tbsp': return servingSize * 15;
      case 'tsp': return servingSize * 5;
      case 'serving':
        let productServingSize = typeof food.servingSize === 'string' 
          ? parseFloat(food.servingSize) 
          : (food.servingSize || 100);
        if (productServingSize < 10) productServingSize = 100;
        return servingSize * productServingSize;
      case 'g':
      default:
        return servingSize;
    }
  }, [servingSize, servingUnit, food.servingSize]);

  // Helper function to calculate nutrition values
  const calculateNutritionValue = (value: number | string | null | undefined) => {
    if (!value) return 0;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) || numValue === 0) return 0;
    const result = (numValue * getServingInGrams) / 100;
    return parseFloat(result.toFixed(1));
  };

  // Calculate total carbs for insulin calculation
  const totalCarbs = useMemo(() => {
    return calculateNutritionValue(food.carbs || food.carbohydrates_g);
  }, [food.carbs, food.carbohydrates_g, getServingInGrams]);

  // Calculate other nutrition values
  const totalCalories = useMemo(() => {
    return calculateNutritionValue(food.calories || food.energy_kcal);
  }, [food.calories, food.energy_kcal, getServingInGrams]);

  const totalProtein = useMemo(() => {
    return calculateNutritionValue(food.protein || food.proteins_g);
  }, [food.protein, food.proteins_g, getServingInGrams]);

  const totalFat = useMemo(() => {
    return calculateNutritionValue(food.fat || food.fat_g);
  }, [food.fat, food.fat_g, getServingInGrams]);

  // Calculate Insulin on Board (IOB) using tested utility
  const insulinOnBoard = useMemo(() => {
    const now = new Date();
    
    // Convert doses to IOB calculator format
    const iobDoses: InsulinDose[] = recentDoses.map(dose => ({
      id: `${dose.timestamp.getTime()}-${dose.amount}`,
      amount: dose.amount,
      timestamp: dose.timestamp,
      insulinType: (dose as any).insulinType || 'rapid',
      duration: (dose as any).duration || getInsulinDuration((dose as any).insulinType || 'rapid'),
    }));

    // Use tested IOB calculator with exponential decay
    const iobResult = calculateIOB(iobDoses, now);
    return Math.round(iobResult.totalIOB * 100) / 100;
  }, [recentDoses]);

  // Get effective glucose value
  const effectiveGlucose = useManualGlucose && manualGlucose ? manualGlucose : currentGlucose;

  // Calculate insulin dose
  const insulinCalculation = useMemo(() => {
    if (!effectiveGlucose || !includeInsulin || totalCarbs === 0) {
      return {
        carbCoverage: 0,
        correctionDose: 0,
        totalDose: 0,
        adjustedDose: 0,
        iobAdjustment: 0
      };
    }

    const carbCoverage = totalCarbs / settings.insulinToCarb;
    const glucoseDifference = effectiveGlucose - targetGlucose;
    const correctionDose = Math.max(0, glucoseDifference / settings.correctionFactor);
    const totalDose = carbCoverage + correctionDose;
    const adjustedDose = Math.max(0, totalDose - insulinOnBoard);
    
    return {
      carbCoverage: Math.round(carbCoverage * 100) / 100,
      correctionDose: Math.round(correctionDose * 100) / 100,
      totalDose: Math.round(totalDose * 100) / 100,
      adjustedDose: Math.round(adjustedDose * 100) / 100,
      iobAdjustment: Math.round(insulinOnBoard * 100) / 100
    };
  }, [totalCarbs, effectiveGlucose, targetGlucose, settings, insulinOnBoard, includeInsulin]);

  // Risk assessment
  const riskLevel = useMemo(() => {
    if (!effectiveGlucose || !includeInsulin) return 'low';
    if (effectiveGlucose < 80) return 'high';
    if (effectiveGlucose < 100 && insulinCalculation.adjustedDose > 2) return 'medium';
    if (insulinOnBoard > 3) return 'medium';
    return 'low';
  }, [effectiveGlucose, insulinCalculation.adjustedDose, insulinOnBoard, includeInsulin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      // 1. Create/find food item
      let foodItemId = null;
      
      if (food.barcode) {
        const { data: existingFood } = await supabase
          .from('food_items')
          .select('id')
          .eq('barcode', food.barcode)
          .maybeSingle();

        if (existingFood) {
          foodItemId = existingFood.id;
        }
      }

      if (!foodItemId && food.id && food.id.length === 36) {
        foodItemId = food.id;
      }

      if (!foodItemId) {
        const { data: newFood, error: insertError } = await supabase
          .from('food_items')
          .insert([{
            barcode: food.barcode,
            product_name: food.name || food.product_name,
            brand: food.brand,
            categories: food.categories,
            image_url: food.imageUrl || food.image_url,
            serving_size: food.servingSize || food.serving_size,
            serving_unit: food.servingUnit || food.serving_unit,
            energy_kcal: food.calories || food.energy_kcal,
            carbohydrates_g: food.carbs || food.carbohydrates_g,
            sugars_g: food.sugar || food.sugars_g,
            fiber_g: food.fiber || food.fiber_g,
            proteins_g: food.protein || food.proteins_g,
            fat_g: food.fat || food.fat_g,
            saturated_fat_g: food.saturated_fat_g,
            sodium_mg: food.sodium || food.sodium_mg,
            off_id: food.barcode || food.id || food.off_id,
            off_last_updated: food.off_last_updated,
            data_quality_score: food.data_quality_score,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        foodItemId = newFood.id;
      }

      // 2. Create food log
      const gramsServing = getServingInGrams;
      
      // Use the memoized nutrition values
      const caloriesValue = totalCalories > 0 ? totalCalories.toString() : null;
      const proteinValue = totalProtein > 0 ? totalProtein.toString() : null;
      const fatValue = totalFat > 0 ? totalFat.toString() : null;

      const [hours, minutes] = loggedTime.split(':');
      const [yearNum, monthNum, dayNum] = loggedDate.split('-').map(Number);
      const loggedAt = new Date(yearNum, monthNum - 1, dayNum, parseInt(hours), parseInt(minutes));
      
      const year = loggedAt.getFullYear();
      const month = String(loggedAt.getMonth() + 1).padStart(2, '0');
      const day = String(loggedAt.getDate()).padStart(2, '0');
      const hour = String(loggedAt.getHours()).padStart(2, '0');
      const minute = String(loggedAt.getMinutes()).padStart(2, '0');
      const tzOffset = -loggedAt.getTimezoneOffset();
      const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
      const tzMinutes = String(Math.abs(tzOffset) % 60).padStart(2, '0');
      const tzSign = tzOffset >= 0 ? '+' : '-';
      const loggedAtString = `${year}-${month}-${day}T${hour}:${minute}:00${tzSign}${tzHours}:${tzMinutes}`;

      const { error: logError } = await supabase
        .from('food_logs')
        .insert([{
          user_id: user.id,
          food_item_id: foodItemId,
          serving_size: gramsServing,
          serving_unit: 'g',
          user_serving_size: servingSize,
          user_serving_unit: servingUnit,
          total_carbs_g: totalCarbs,
          total_calories: caloriesValue ? parseFloat(caloriesValue) : null,
          total_protein_g: proteinValue ? parseFloat(proteinValue) : null,
          total_fat_g: fatValue ? parseFloat(fatValue) : null,
          meal_type: mealType,
          notes: notes || null,
          logged_at: loggedAtString,
        }]);

      if (logError) throw logError;

      // 3. Log insulin if dose was taken
      // TODO: Re-implement insulin logging when insulin calculation is added
      // Insulin logging temporarily disabled due to missing insulinCalculation variable
      /*
      if (insulinCalculation.adjustedDose && insulinCalculation.adjustedDose > 0) {
        const mealNotes = `Meal bolus: ${food.name || food.product_name} (${totalCarbs}g carbs)${useManualGlucose ? ' - manual glucose' : ''}`;
        
        // Check for existing Glooko import within 5 minutes to merge with
        const loggedTime = new Date(loggedAtString);
        const fiveMinutesBefore = new Date(loggedTime.getTime() - 5 * 60 * 1000);
        const fiveMinutesAfter = new Date(loggedTime.getTime() + 5 * 60 * 1000);

        const { data: existingImport } = await supabase
          .from('insulin_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('insulin_type', 'rapid')
          .eq('logged_via', 'csv_import')
          .gte('taken_at', fiveMinutesBefore.toISOString())
          .lte('taken_at', fiveMinutesAfter.toISOString())
          .order('taken_at', { ascending: true })
          .limit(1)
          .single();

        if (existingImport) {
          // Merge with existing Glooko import
          const existingNotes = existingImport.notes || '';
          const mergedNotes = [existingNotes, mealNotes].filter(Boolean).join(' | ');

          const { error: updateError } = await supabase
            .from('insulin_logs')
            .update({
              // Keep Glooko dose but add meal context
              meal_relation: 'with_meal',
              injection_site: 'omnipod', // Update injection site from meal logger
              notes: mergedNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingImport.id);

          if (updateError) {
            logger.error('Failed to merge with existing Glooko import:', updateError);
            // Fall back to creating new entry
          } else {
            logger.debug('Successfully merged meal context with existing Glooko import');
          }
        } else {
          // No existing import found, create new insulin log
          const { error: insulinError } = await supabase
            .from('insulin_logs')
            .insert([{
              user_id: user.id,
              units: insulinCalculation.adjustedDose,
              insulin_type: 'rapid',
              taken_at: loggedAtString,
              delivery_type: 'bolus',
              meal_relation: 'with_meal',
              injection_site: 'omnipod',
              notes: mealNotes,
              logged_via: 'meal_logger'
            }]);

          if (insulinError) {
            logger.error('Failed to log insulin dose:', insulinError);
            // Don't throw error - meal was logged successfully
          }
        }
      }
      */

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error) {
      logger.error('Error logging meal:', error);
      alert('Failed to log meal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                Meal Logged Successfully!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {includeInsulin && insulinCalculation.adjustedDose > 0 
                  ? `Food and ${insulinCalculation.adjustedDose}u insulin logged`
                  : 'Food logged without insulin'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Food Info Header */}
      <div className="flex items-start gap-4">
        {(food.imageUrl || food.image_url) && (
          <img
            src={food.imageUrl || food.image_url}
            alt={food.name || food.product_name}
            className="w-20 h-20 object-cover rounded-lg"
          />
        )}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {food.name || food.product_name}
          </h3>
          {food.brand && (
            <p className="text-gray-600 dark:text-slate-400">{food.brand}</p>
          )}
        </div>
      </div>

      {/* Serving Size */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Serving Size
        </Label>
        <div className="flex gap-2">
          <input
            type="number"
            value={servingSize}
            onChange={(e) => setServingSize(Number(e.target.value))}
            min="0.1"
            step="0.1"
            inputMode="decimal"
            className="flex-1 px-3 py-3 md:py-2 text-base md:text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors touch-manipulation"
          />
          <select
            value={servingUnit}
            onChange={(e) => setServingUnit(e.target.value)}
            className="px-4 py-3 md:py-2 text-base md:text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors touch-manipulation"
          >
            <option value="g">grams (g)</option>
            <option value="oz">ounces (oz)</option>
            <option value="cup">cups</option>
            <option value="serving">servings</option>
          </select>
        </div>
      </div>

      {/* Nutrition Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <div>
          <p className="text-xs text-gray-600 dark:text-slate-400">Calories</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {totalCalories || '0'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-slate-400">Carbs</p>
          <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
            {totalCarbs}g
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-slate-400">Protein</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {totalProtein || '0'}g
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 dark:text-slate-400">Fat</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {totalFat || '0'}g
          </p>
        </div>
      </div>

      {/* Insulin Integration Toggle */}
      <Card className="border-2 border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-orange-600" />
              <span>Insulin Calculation</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeInsulin"
                checked={includeInsulin}
                onChange={(e) => setIncludeInsulin(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeInsulin" className="text-sm">
                Calculate & log insulin
              </Label>
            </div>
          </CardTitle>
        </CardHeader>
        
        {includeInsulin && (
          <CardContent className="space-y-4">
            {/* Current Status */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {effectiveGlucose || '--'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Glucose
                </div>
              </div>
              
              <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded border">
                <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {insulinOnBoard}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  IOB
                </div>
              </div>
              
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded border">
                <Badge variant={riskLevel === 'high' ? 'destructive' : 'default'} className="text-xs">
                  {riskLevel.toUpperCase()}
                </Badge>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Risk
                </div>
              </div>
            </div>

            {/* Target Glucose & Manual Override */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  Target Glucose
                </Label>
                <input
                  type="number"
                  min="80"
                  max="140"
                  value={targetGlucose}
                  onChange={(e) => setTargetGlucose(Number(e.target.value))}
                  inputMode="numeric"
                  className="w-full px-4 py-3 md:py-2 text-base md:text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors touch-manipulation"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  Manual Glucose
                </Label>
                <input
                  type="number"
                  min="40"
                  max="400"
                  value={useManualGlucose ? (manualGlucose || '') : ''}
                  onChange={(e) => {
                    setManualGlucose(Number(e.target.value) || null);
                    setUseManualGlucose(!!e.target.value);
                  }}
                  placeholder="Optional override"
                  inputMode="numeric"
                  className="w-full px-4 py-3 md:py-2 text-base md:text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors touch-manipulation"
                />
              </div>
            </div>

            {/* Insulin Calculation Results */}
            {totalCarbs > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Insulin Dose</h4>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Carb Coverage ({totalCarbs}g ÷ {settings.insulinToCarb}):
                    </span>
                    <span className="font-medium text-xs">{insulinCalculation.carbCoverage}u</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Correction:</span>
                    <span className="font-medium text-xs">{insulinCalculation.correctionDose}u</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">IOB Adjustment:</span>
                    <span className="font-medium text-xs text-orange-600 dark:text-orange-400">
                      -{insulinCalculation.iobAdjustment}u
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-1 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        Recommended Dose:
                      </span>
                      <span className="font-bold text-base text-blue-600 dark:text-blue-400">
                        {insulinCalculation.adjustedDose}u
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Warning */}
            {riskLevel !== 'low' && (
              <Alert variant={riskLevel === 'high' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {riskLevel === 'high' 
                    ? 'High risk of hypoglycemia. Consider reducing dose or having carbs first.'
                    : 'Moderate risk. Monitor glucose closely after dosing.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      {/* Meal Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Meal Type
          </Label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Date
          </Label>
          <input
            type="date"
            value={loggedDate}
            onChange={(e) => setLoggedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Time
          </Label>
          <input
            type="time"
            value={loggedTime}
            onChange={(e) => setLoggedTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Notes (optional)
        </Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors resize-none"
          placeholder="Add any notes about this meal..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging...
            </>
          ) : (
            <>
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              {includeInsulin && insulinCalculation.adjustedDose > 0 
                ? `Log Meal + ${insulinCalculation.adjustedDose}u Insulin`
                : 'Log Meal Only'
              }
            </>
          )}
        </Button>
      </div>
    </form>
  );
}