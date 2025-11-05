'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Utensils, Calculator, Syringe, Activity } from 'lucide-react';


interface SmartFoodLoggerProps {
  onFoodLogged?: () => void;
  currentGlucose?: number | null;
  recentMeals?: any[];
  insulinHistory?: any[];
}

interface CarbRatioSuggestion {
  ratio: number;
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;
  suggestedDose: number;
}

export function SmartFoodLogger({ 
  onFoodLogged, 
  currentGlucose, 
  recentMeals = [], 
  insulinHistory = [] 
}: SmartFoodLoggerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [servingSize, setServingSize] = useState('1');
  const [customCarbs, setCustomCarbs] = useState('');
  const [showInsulinSuggestion, setShowInsulinSuggestion] = useState(false);



  // Calculate intelligent carb ratio suggestions
  const carbRatioSuggestion = useMemo((): CarbRatioSuggestion | null => {
    if (!selectedFood || !insulinHistory.length || !recentMeals.length) return null;

    // Analyze recent successful meals (last 30 days)
    const recentSuccessfulMeals = recentMeals
      .filter(meal => {
        const mealDate = new Date(meal.logged_at);
        const daysSince = (Date.now() - mealDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      })
      .slice(0, 10); // Last 10 meals

    if (recentSuccessfulMeals.length < 3) {
      return {
        ratio: 15, // Default conservative ratio
        confidence: 'low',
        basedOn: 'Default ratio (insufficient data)',
        suggestedDose: Math.round((selectedFood.total_carbs || 0) / 15 * 10) / 10
      };
    }

    // Calculate average carb ratio from recent meals
    const ratios = recentSuccessfulMeals
      .map(meal => {
        // Find insulin taken within 2 hours of meal
        const mealTime = new Date(meal.logged_at);
        const relatedInsulin = insulinHistory.find(insulin => {
          const insulinTime = new Date(insulin.taken_at);
          const timeDiff = Math.abs(mealTime.getTime() - insulinTime.getTime());
          return timeDiff <= 2 * 60 * 60 * 1000; // 2 hours
        });

        if (relatedInsulin && meal.total_carbs > 0) {
          return meal.total_carbs / relatedInsulin.units;
        }
        return null;
      })
      .filter((ratio): ratio is number => ratio !== null);

    if (ratios.length === 0) {
      return {
        ratio: 15,
        confidence: 'low',
        basedOn: 'Default ratio (no insulin data)',
        suggestedDose: Math.round((selectedFood.total_carbs || 0) / 15 * 10) / 10
      };
    }

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const confidence = ratios.length >= 5 ? 'high' : ratios.length >= 3 ? 'medium' : 'low';
    
    // Adjust for current glucose if available
    let adjustedRatio = avgRatio;
    if (currentGlucose) {
      if (currentGlucose > 180) {
        adjustedRatio *= 0.9; // More aggressive dosing for high glucose
      } else if (currentGlucose < 100) {
        adjustedRatio *= 1.1; // More conservative dosing for lower glucose
      }
    }

    const totalCarbs = selectedFood.total_carbs || 0;
    const suggestedDose = totalCarbs > 0 ? Math.round(totalCarbs / adjustedRatio * 10) / 10 : 0;

    return {
      ratio: Math.round(adjustedRatio),
      confidence,
      basedOn: `Based on ${ratios.length} recent meals`,
      suggestedDose
    };
  }, [selectedFood, insulinHistory, recentMeals, currentGlucose]);

  // Search for foods
  const searchFoods = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results.slice(0, 10)); // Limit to 10 results
      }
    } catch (error) {
      console.error('Food search error:', error);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchFoods(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate total carbs based on serving size
  const totalCarbs = useMemo(() => {
    if (customCarbs) return parseFloat(customCarbs) || 0;
    if (!selectedFood) return 0;
    
    const serving = parseFloat(servingSize) || 1;
    return Math.round((selectedFood.carbs_per_serving || 0) * serving * 10) / 10;
  }, [selectedFood, servingSize, customCarbs]);

  // Update selected food total carbs
  useEffect(() => {
    if (selectedFood) {
      setSelectedFood((prev: any) => ({ ...prev, total_carbs: totalCarbs }));
    }
  }, [totalCarbs]);

  const handleFoodSelect = (food: any) => {
    setSelectedFood(food);
    setSearchQuery(food.product_name || food.custom_food_name || '');
    setSearchResults([]);
    setCustomCarbs('');
    setShowInsulinSuggestion(true);
  };

  const handleLogFood = async () => {
    if (!selectedFood || totalCarbs <= 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/food/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedFood,
          serving_size: parseFloat(servingSize) || 1,
          total_carbs: totalCarbs,
          logged_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Reset form
        setSelectedFood(null);
        setSearchQuery('');
        setServingSize('1');
        setCustomCarbs('');
        setShowInsulinSuggestion(false);
        
        onFoodLogged?.();
      }
    } catch (error) {
      console.error('Error logging food:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogInsulin = async () => {
    if (!carbRatioSuggestion?.suggestedDose) return;

    try {
      const response = await fetch('/api/insulin/bolus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          units: carbRatioSuggestion.suggestedDose,
          insulin_type: 'rapid_acting',
          notes: `For ${selectedFood?.product_name || selectedFood?.custom_food_name} (${totalCarbs}g carbs)`,
          taken_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Also log the food
        await handleLogFood();
      }
    } catch (error) {
      console.error('Error logging insulin:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Smart Food Logger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Glucose Display */}
        {currentGlucose && (
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              Current glucose: <strong>{currentGlucose} mg/dL</strong>
              {currentGlucose > 180 && ' (Consider correction dose)'}
              {currentGlucose < 100 && ' (Consider reducing insulin dose)'}
            </AlertDescription>
          </Alert>
        )}

        {/* Food Search */}
        <div className="space-y-2">
          <Label htmlFor="food-search">Search for food</Label>
          <Input
            id="food-search"
            placeholder="Type food name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {searchResults.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((food, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-b-0"
                  onClick={() => handleFoodSelect(food)}
                >
                  <div className="font-medium">{food.product_name || food.custom_food_name}</div>
                  <div className="text-sm text-slate-500">
                    {food.carbs_per_serving}g carbs per serving
                    {food.brand && ` • ${food.brand}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Food Details */}
        {selectedFood && (
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <h4 className="font-medium">{selectedFood.product_name || selectedFood.custom_food_name}</h4>
              {selectedFood.brand && (
                <p className="text-sm text-slate-500">{selectedFood.brand}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serving-size">Serving Size</Label>
                <Input
                  id="serving-size"
                  type="number"
                  step="0.1"
                  value={servingSize}
                  onChange={(e) => setServingSize(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="custom-carbs">Custom Carbs (optional)</Label>
                <Input
                  id="custom-carbs"
                  type="number"
                  step="0.1"
                  placeholder="Override carbs"
                  value={customCarbs}
                  onChange={(e) => setCustomCarbs(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border">
              <span className="font-medium">Total Carbs:</span>
              <Badge variant="secondary" className="text-lg">
                {totalCarbs}g
              </Badge>
            </div>
          </div>
        )}

        {/* Insulin Suggestion */}
        {showInsulinSuggestion && carbRatioSuggestion && totalCarbs > 0 && (
          <Alert>
            <Calculator className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Suggested insulin dose:</span>
                  <Badge className="bg-blue-600 text-white">
                    {carbRatioSuggestion.suggestedDose}u
                  </Badge>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Carb ratio: 1:{carbRatioSuggestion.ratio} ({carbRatioSuggestion.confidence} confidence)
                  <br />
                  {carbRatioSuggestion.basedOn}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {selectedFood && (
          <div className="flex gap-2">
            <Button
              onClick={handleLogFood}
              disabled={isLoading || totalCarbs <= 0}
              className="flex-1"
            >
              <Utensils className="h-4 w-4 mr-2" />
              Log Food Only
            </Button>
            
            {carbRatioSuggestion?.suggestedDose && (
              <Button
                onClick={handleLogInsulin}
                disabled={isLoading}
                variant="default"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Syringe className="h-4 w-4 mr-2" />
                Log Food + Insulin
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}