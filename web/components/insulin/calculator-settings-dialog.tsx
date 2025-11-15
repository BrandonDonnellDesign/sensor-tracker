'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCalculatorSettings, type CalculatorSettings } from '@/lib/hooks/use-calculator-settings';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Cloud,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react';

interface CalculatorSettingsDialogProps {
  children?: React.ReactNode;
}

export function CalculatorSettingsDialog({ children }: CalculatorSettingsDialogProps) {
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    isLoading,
    error 
  } = useCalculatorSettings();
  
  const [open, setOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<CalculatorSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update tempSettings when settings change
  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTempSettings(settings);
      setSaveSuccess(false);
    }
  };

  const handleSave = async () => {
    console.log('Saving settings:', tempSettings);
    await updateSettings(tempSettings);
    setOpen(false);
  };

  const handleReset = async () => {
    await resetSettings();
    setTempSettings({
      insulinToCarb: 15,
      correctionFactor: 50,
      targetGlucose: 100,
      rapidActingDuration: 4,
      shortActingDuration: 6
    });
  };



  const updateTempSetting = (key: keyof CalculatorSettings, value: number) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-gray-900 border-2 shadow-xl backdrop-blur-none max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-6 h-6 text-blue-600" />
            Calculator Settings
          </DialogTitle>
          <DialogDescription className="text-gray-700 dark:text-gray-300 font-medium">
            Customize your insulin calculator parameters. These should be determined with your healthcare provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Insulin-to-Carb Ratio */}
          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
            <Label htmlFor="icr" className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Insulin-to-Carb Ratio (I:C)
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">1 unit per</span>
              <Input
                id="icr"
                type="number"
                min="5"
                max="50"
                step="0.5"
                value={tempSettings.insulinToCarb}
                onChange={(e) => updateTempSetting('insulinToCarb', parseFloat(e.target.value) || 15)}
                placeholder="15"
                className="w-20 text-center font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">grams of carbs</span>
            </div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Example: 1 unit covers {tempSettings.insulinToCarb}g carbs
            </p>
          </div>

          {/* Correction Factor */}
          <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border">
            <Label htmlFor="isf" className="text-sm font-semibold text-green-900 dark:text-green-100">
              Correction Factor (ISF)
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">1 unit lowers glucose by</span>
              <Input
                id="isf"
                type="number"
                min="20"
                max="150"
                step="5"
                value={tempSettings.correctionFactor}
                onChange={(e) => updateTempSetting('correctionFactor', parseFloat(e.target.value) || 50)}
                placeholder="50"
                className="w-20 text-center font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">mg/dL</span>
            </div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Example: 1 unit drops glucose {tempSettings.correctionFactor} mg/dL
            </p>
          </div>

          {/* Target Glucose */}
          <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border">
            <Label htmlFor="target" className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              Target Glucose
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="target"
                type="number"
                min="80"
                max="140"
                step="5"
                value={tempSettings.targetGlucose}
                onChange={(e) => updateTempSetting('targetGlucose', parseFloat(e.target.value) || 100)}
                placeholder="100"
                className="w-20 text-center font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2"
              />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">mg/dL</span>
            </div>
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Corrections aim for this glucose level
            </p>
          </div>

          {/* Insulin Durations */}
          <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border">
            <Label className="text-sm font-semibold text-orange-900 dark:text-orange-100">
              Insulin Duration Settings
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rapid" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Rapid Acting (hours)
                </Label>
                <Input
                  id="rapid"
                  type="number"
                  min="2"
                  max="8"
                  step="0.5"
                  value={tempSettings.rapidActingDuration}
                  onChange={(e) => updateTempSetting('rapidActingDuration', parseFloat(e.target.value) || 4)}
                  placeholder="4"
                  className="text-center font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="short" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Short Acting (hours)
                </Label>
                <Input
                  id="short"
                  type="number"
                  min="4"
                  max="12"
                  step="0.5"
                  value={tempSettings.shortActingDuration}
                  onChange={(e) => updateTempSetting('shortActingDuration', parseFloat(e.target.value) || 6)}
                  placeholder="6"
                  className="text-center font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2"
                />
              </div>
            </div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Used for IOB calculations and dose timing
            </p>
          </div>

          {/* Alerts */}
          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200 font-medium">
              These parameters significantly affect insulin dosing calculations. 
              Always consult with your healthcare provider before making changes.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {saveSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              <Save className="h-4 w-4" />
              <AlertDescription>Settings saved to your profile successfully!</AlertDescription>
            </Alert>
          )}

          {/* Auto-Save Info */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
              <Cloud className="w-4 h-4" />
              Auto-Save Enabled
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
              Settings are automatically saved to your profile and synced across devices
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Reset Defaults
          </Button>
          
          <Button 
            onClick={async () => {
              console.log('Current settings in dialog:', settings);
              console.log('Temp settings to save:', tempSettings);
              await handleSave();
            }} 
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Apply Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}