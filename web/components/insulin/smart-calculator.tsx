'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInsulinData } from '@/lib/hooks/use-insulin-data';
import { useCalculatorSettings } from '@/lib/hooks/use-calculator-settings';
import { CalculatorSettingsDialog } from './calculator-settings-dialog';
import { 
  Calculator, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Zap,
  RefreshCw,
  Loader2,
  Settings
} from 'lucide-react';





interface SmartCalculatorProps {
  className?: string;
}

export function SmartCalculator({ 
  className = '' 
}: SmartCalculatorProps) {
  // Fetch real data from API
  const { 
    doses: recentDoses, 
    currentGlucose, 
    isLoading, 
    error, 
    refetch 
  } = useInsulinData();

  // Get user's calculator settings
  const { settings } = useCalculatorSettings();

  const [carbs, setCarbs] = useState<number>(0);
  const [targetGlucose, setTargetGlucose] = useState<number>(settings.targetGlucose);
  const [manualGlucose, setManualGlucose] = useState<number | null>(null);
  const [useManualGlucose, setUseManualGlucose] = useState<boolean>(false);

  // Update target glucose when settings change
  useEffect(() => {
    setTargetGlucose(settings.targetGlucose);
  }, [settings.targetGlucose]);

  // Calculate Insulin on Board (IOB)
  const insulinOnBoard = useMemo(() => {
    const now = new Date();
    let totalIOB = 0;

    recentDoses.forEach(dose => {
      const hoursElapsed = (now.getTime() - dose.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed < dose.duration) {
        // Linear decay model (can be enhanced with exponential decay)
        const remainingPercentage = Math.max(0, (dose.duration - hoursElapsed) / dose.duration);
        totalIOB += dose.amount * remainingPercentage;
      }
    });

    return Math.round(totalIOB * 100) / 100;
  }, [recentDoses]);

  // Get the effective glucose value (manual override or current reading)
  const effectiveGlucose = useManualGlucose && manualGlucose ? manualGlucose : currentGlucose;

  // Calculate recommended doses
  const calculations = useMemo(() => {
    if (!effectiveGlucose) {
      return {
        carbCoverage: 0,
        correctionDose: 0,
        totalDose: 0,
        adjustedDose: 0,
        iobAdjustment: 0
      };
    }

    // Carb coverage
    const carbCoverage = carbs / settings.insulinToCarb;
    
    // Correction dose
    const glucoseDifference = effectiveGlucose - targetGlucose;
    const correctionDose = Math.max(0, glucoseDifference / settings.correctionFactor);
    
    // Total recommended dose
    const totalDose = carbCoverage + correctionDose;
    
    // Adjust for IOB
    const adjustedDose = Math.max(0, totalDose - insulinOnBoard);
    
    return {
      carbCoverage: Math.round(carbCoverage * 100) / 100,
      correctionDose: Math.round(correctionDose * 100) / 100,
      totalDose: Math.round(totalDose * 100) / 100,
      adjustedDose: Math.round(adjustedDose * 100) / 100,
      iobAdjustment: Math.round(insulinOnBoard * 100) / 100
    };
  }, [carbs, effectiveGlucose, targetGlucose, settings, insulinOnBoard]);

  // Risk assessment
  const riskLevel = useMemo(() => {
    if (!effectiveGlucose) return 'low';
    if (effectiveGlucose < 80) return 'high';
    if (effectiveGlucose < 100 && calculations.adjustedDose > 2) return 'medium';
    if (insulinOnBoard > 3) return 'medium';
    return 'low';
  }, [effectiveGlucose, calculations.adjustedDose, insulinOnBoard]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  const getRiskMessage = (level: string) => {
    switch (level) {
      case 'high': return 'High risk of hypoglycemia. Consider reducing dose or having carbs first.';
      case 'medium': return 'Moderate risk. Monitor glucose closely after dosing.';
      default: return 'Low risk. Dose appears safe based on current parameters.';
    }
  };

  const handleLogDose = async (amount: number) => {
    try {
      const response = await fetch('/api/insulin/doses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          type: 'rapid',
          timestamp: new Date().toISOString(),
          meal_carbs: carbs > 0 ? carbs : null,
          pre_glucose: effectiveGlucose,
          notes: `Smart calculator: ${calculations.carbCoverage}u carbs + ${calculations.correctionDose}u correction - ${calculations.iobAdjustment}u IOB${useManualGlucose ? ' (manual glucose)' : ''}`
        }),
      });

      if (response.ok) {
        // Reset inputs and refresh data
        setCarbs(0);
        setManualGlucose(null);
        setUseManualGlucose(false);
        await refetch();
      } else {
        console.error('Failed to log dose');
      }
    } catch (error) {
      console.error('Error logging dose:', error);
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Smart Insulin Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading insulin and glucose data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Smart Insulin Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={refetch} 
            className="mt-4 w-full"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Loading Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Calculator */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span className="text-base font-semibold">Smart Calculator</span>
            </div>
            <div className="flex items-center gap-1">
              <CalculatorSettingsDialog>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Settings
                </Button>
              </CalculatorSettingsDialog>
              
              <Button 
                onClick={refetch} 
                variant="ghost" 
                size="sm"
                className="h-7 px-2 text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Current Status */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded border border-blue-200 dark:border-blue-800">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {effectiveGlucose || '--'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {useManualGlucose ? 'Manual' : 'Glucose'}
              </div>
              <div className="text-xs text-gray-500">
                {!effectiveGlucose ? 'No data' : 'mg/dL'}
              </div>
              {useManualGlucose && (
                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Override
                </div>
              )}
            </div>
            
            <div className="text-center p-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded border border-orange-200 dark:border-orange-800">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {insulinOnBoard}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                IOB
              </div>
              <div className="text-xs text-gray-500">
                units
              </div>
            </div>
            
            <div className="text-center p-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded border border-green-200 dark:border-green-800">
              <Badge variant={getRiskColor(riskLevel)} className="text-xs font-semibold mb-1">
                {riskLevel.toUpperCase()}
              </Badge>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Risk
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="carbs" className="text-sm font-medium">Carbohydrates</Label>
              <div className="relative">
                <Input
                  id="carbs"
                  type="number"
                  min="0"
                  max="200"
                  value={carbs || ''}
                  onChange={(e) => setCarbs(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 h-12 text-lg"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">g</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target" className="text-sm font-medium">Target Glucose</Label>
              <div className="relative">
                <Input
                  id="target"
                  type="number"
                  min="80"
                  max="140"
                  value={targetGlucose || ''}
                  onChange={(e) => setTargetGlucose(Number(e.target.value) || 100)}
                  placeholder="100"
                  className="pr-16 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 h-12 text-lg"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">mg/dL</span>
              </div>
            </div>
          </div>

          {/* Manual Glucose Override */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Manual Glucose Override
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useManual"
                  checked={useManualGlucose}
                  onChange={(e) => setUseManualGlucose(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="useManual" className="text-xs text-yellow-700 dark:text-yellow-300">
                  Enable
                </Label>
              </div>
            </div>
            
            {useManualGlucose && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type="number"
                    min="40"
                    max="400"
                    value={manualGlucose || ''}
                    onChange={(e) => setManualGlucose(Number(e.target.value) || null)}
                    placeholder="Enter glucose reading..."
                    className="pr-16 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">mg/dL</span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  This will override the automatic glucose reading for calculations
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Calculation Results */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Dose Calculation</h3>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">Carb Coverage:</span>
                <span className="font-medium text-xs">{calculations.carbCoverage} units</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">Correction:</span>
                <span className="font-medium text-xs">{calculations.correctionDose} units</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-xs">{calculations.totalDose} units</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">IOB Adjustment:</span>
                <span className="font-medium text-xs text-orange-600 dark:text-orange-400">
                  -{calculations.iobAdjustment} units
                </span>
              </div>
              
              <div className="border-t border-gray-300 dark:border-gray-600 pt-1 mt-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">Recommended Dose:</span>
                  <span className="font-bold text-base text-blue-600 dark:text-blue-400">
                    {calculations.adjustedDose} units
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <Alert variant={riskLevel === 'high' ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {getRiskMessage(riskLevel)}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              className="flex-1 h-9"
              disabled={calculations.adjustedDose === 0 || !effectiveGlucose}
              onClick={() => handleLogDose(calculations.adjustedDose)}
            >
              <Zap className="w-4 h-4 mr-1" />
              {calculations.adjustedDose === 0 ? 'No Dose Needed' : `Log ${calculations.adjustedDose} units`}
            </Button>
            
            <Button variant="outline" className="h-9 px-3">
              <Clock className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 justify-between text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-gray-600" />
              <span className="text-gray-700 dark:text-gray-300">Settings</span>
            </div>
            <CalculatorSettingsDialog>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </CalculatorSettingsDialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-center">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded border">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                1:{settings.insulinToCarb}
              </div>
              <div className="text-xs text-gray-500">I:C</div>
            </div>
            
            <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded border">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                1:{settings.correctionFactor}
              </div>
              <div className="text-xs text-gray-500">ISF</div>
            </div>
            
            <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded border">
              <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                {settings.targetGlucose}
              </div>
              <div className="text-xs text-gray-500">Target</div>
            </div>
            
            <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded border">
              <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                {settings.rapidActingDuration}h
              </div>
              <div className="text-xs text-gray-500">Rapid</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}