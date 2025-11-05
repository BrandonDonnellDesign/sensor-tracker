'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Syringe, 
  Save, 
  Clock,
  Droplets,
  MapPin,
  CheckCircle
} from 'lucide-react';

export function BolusLogger() {
  // Helper function to get current local time in datetime-local format
  const getCurrentLocalDateTime = () => {
    const now = new Date();
    // Adjust for timezone offset to get local time
    const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return localTime.toISOString().slice(0, 16);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    units: '',
    notes: '',
    taken_at: getCurrentLocalDateTime(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.units) {
      alert('Please enter insulin units');
      return;
    }

    setIsLoading(true);
    try {
      // Convert local datetime to UTC ISO string
      const localDateTime = new Date(formData.taken_at);
      const utcDateTime = localDateTime.toISOString();
      
      const response = await fetch('/api/insulin/bolus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          units: parseFloat(formData.units),
          injection_site: 'omnipod', // Always Omnipod
          notes: formData.notes || null,
          taken_at: utcDateTime,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        // Reset form
        setFormData({
          units: '',
          notes: '',
          taken_at: getCurrentLocalDateTime(),
        });
        
        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to log insulin');
      }
    } catch (error) {
      console.error('Error logging insulin:', error);
      alert('Failed to log insulin');
    } finally {
      setIsLoading(false);
    }
  };

  const quickUnits = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10];

  return (
    <div className="max-w-2xl">
      <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <Syringe className="w-5 h-5 text-white" />
            </div>
            Quick Bolus Entry
          </CardTitle>
          <CardDescription>
            Enter your bolus details below
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {showSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Bolus Logged Successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your Omnipod bolus has been recorded
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Units Input */}
            <div className="space-y-3">
              <Label htmlFor="units" className="flex items-center gap-2 text-base font-medium">
                <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Bolus Amount *
              </Label>
              <Input
                id="units"
                type="number"
                step="0.1"
                value={formData.units}
                onChange={(e) => setFormData(prev => ({ ...prev, units: e.target.value }))}
                placeholder="0.0"
                className="text-xl font-medium h-12 text-center text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                style={{ colorScheme: 'light dark' }}
                required
              />
              
              {/* Quick Unit Buttons */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick amounts:</p>
                <div className="grid grid-cols-5 gap-2">
                  {quickUnits.map(unit => (
                    <Button
                      key={unit}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, units: unit.toString() }))}
                      className="text-sm font-medium"
                    >
                      {unit}u
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time */}
            <div>
              <Label htmlFor="taken_at" className="flex items-center gap-2 text-base font-medium">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Time Delivered
              </Label>
              <Input
                id="taken_at"
                type="datetime-local"
                value={formData.taken_at}
                onChange={(e) => setFormData(prev => ({ ...prev, taken_at: e.target.value }))}
                className="h-12 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                style={{ colorScheme: 'light dark' }}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-base font-medium">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Meal details, corrections, etc..."
                className="h-10 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                style={{ colorScheme: 'light dark' }}
              />
            </div>

            {/* Omnipod Info */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Delivery Method
                </span>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Omnipod insulin pump - automated delivery
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={isLoading || !formData.units}
              className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium text-base"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Logging Bolus...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Log Omnipod Bolus
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}