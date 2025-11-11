'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { MobileOptimizedCard } from '@/components/ui/mobile-optimized-card';
import { Syringe, Plus, Check, X } from 'lucide-react';

interface QuickDoseLoggerProps {
  className?: string;
  onDoseLogged?: () => void;
}

export function QuickDoseLogger({ className = '', onDoseLogged }: QuickDoseLoggerProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [dose, setDose] = useState<string>('');
  const [insulinType, setInsulinType] = useState<'rapid' | 'short' | 'intermediate' | 'long'>('rapid');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !dose || parseFloat(dose) <= 0) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const currentTime = new Date();
      const quickDoseNotes = notes || 'Quick dose';
      
      // Check for existing Glooko import within 5 minutes to merge with
      const fiveMinutesBefore = new Date(currentTime.getTime() - 5 * 60 * 1000);
      const fiveMinutesAfter = new Date(currentTime.getTime() + 5 * 60 * 1000);

      const { data: existingImport } = await supabase
        .from('insulin_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('insulin_type', insulinType)
        .eq('logged_via', 'csv_import')
        .gte('taken_at', fiveMinutesBefore.toISOString())
        .lte('taken_at', fiveMinutesAfter.toISOString())
        .order('taken_at', { ascending: true })
        .limit(1)
        .single();

      if (existingImport) {
        // Merge with existing Glooko import
        const existingNotes = existingImport.notes || '';
        const mergedNotes = [existingNotes, `Manual entry: ${quickDoseNotes}`].filter(Boolean).join(' | ');

        const { error } = await supabase
          .from('insulin_logs')
          .update({
            // Keep Glooko dose but add manual context
            injection_site: 'omnipod', // Update injection site from manual entry
            notes: mergedNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingImport.id);

        if (error) throw error;
        console.log('Successfully merged quick dose with existing Glooko import');
      } else {
        // No existing import found, create new insulin log
        const { error } = await supabase
          .from('insulin_logs')
          .insert([{
            user_id: user.id,
            units: parseFloat(dose),
            insulin_type: insulinType,
            taken_at: currentTime.toISOString(),
            delivery_type: 'bolus',
            injection_site: 'omnipod',
            notes: quickDoseNotes,
            logged_via: 'quick_dose'
          }]);

        if (error) throw error;
      }

      // Reset form
      setDose('');
      setNotes('');
      setIsOpen(false);
      
      // Notify parent component
      onDoseLogged?.();
      
    } catch (error) {
      console.error('Error logging insulin dose:', error);
      alert('Failed to log insulin dose. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickDoses = [1, 2, 3, 4, 5, 6, 8, 10];

  if (!isOpen) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-200 ${className}`}>
        <div className="text-center">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md mx-auto w-fit mb-4">
            <Syringe className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Quick Dose Logger
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Log insulin doses quickly and easily
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
          >
            <Plus className="w-5 h-5 mr-2 inline" />
            Log New Dose
          </button>
        </div>
      </div>
    );
  }

  return (
    <MobileOptimizedCard title="Log Insulin Dose" icon={<Syringe className="h-5 w-5" />} className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
          </div>
          <TouchFriendlyButton
            variant="ghost"
            size="sm"
            icon={<X />}
            onClick={() => setIsOpen(false)}
          >
            Close
          </TouchFriendlyButton>
        </div>

        {/* Insulin Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Insulin Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'rapid', label: 'Rapid' },
              { value: 'short', label: 'Short' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'long', label: 'Long' }
            ].map((type) => (
              <TouchFriendlyButton
                key={type.value}
                variant={insulinType === type.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setInsulinType(type.value as any)}
              >
                {type.label}
              </TouchFriendlyButton>
            ))}
          </div>
        </div>

        {/* Quick Dose Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Quick Doses (units)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {quickDoses.map((quickDose) => (
              <TouchFriendlyButton
                key={quickDose}
                variant="outline"
                size="sm"
                onClick={() => setDose(quickDose.toString())}
              >
                {quickDose}u
              </TouchFriendlyButton>
            ))}
          </div>
        </div>

        {/* Custom Dose Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Dose (units)
          </label>
          <input
            type="number"
            min="0"
            max="50"
            step="0.1"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="Enter dose"
            inputMode="decimal"
            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors touch-manipulation"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., correction dose, meal bolus"
            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors touch-manipulation"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <TouchFriendlyButton
            variant="outline"
            size="lg"
            fullWidth
            icon={<X />}
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </TouchFriendlyButton>
          
          <TouchFriendlyButton
            variant="primary"
            size="lg"
            fullWidth
            icon={<Check />}
            onClick={handleSubmit}
            disabled={!dose || parseFloat(dose) <= 0 || isSubmitting}
          >
            {isSubmitting ? 'Logging...' : 'Log Dose'}
          </TouchFriendlyButton>
        </div>
      </div>
    </MobileOptimizedCard>
  );
}