'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MealTemplateBrowser } from './meal-template-browser';
import { CreateTemplateDialog } from './create-template-dialog';
import type { MealTemplate } from '@/types/meal-templates';

interface QuickAddTemplateButtonProps {
  onTemplateSelected: (template: MealTemplate) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function QuickAddTemplateButton({ 
  onTemplateSelected,
  variant = 'outline',
  size = 'default'
}: QuickAddTemplateButtonProps) {
  const [showBrowser, setShowBrowser] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const handleSelectTemplate = (template: MealTemplate) => {
    onTemplateSelected(template);
    setShowBrowser(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowBrowser(true)}
      >
        <BookOpen className="h-4 w-4 mr-2" />
        Use Template
      </Button>

      {/* Template Browser Dialog */}
      <Dialog open={showBrowser} onOpenChange={setShowBrowser}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Meal Template</DialogTitle>
          </DialogHeader>
          <MealTemplateBrowser
            onSelectTemplate={handleSelectTemplate}
            onCreateNew={() => {
              setShowBrowser(false);
              setShowCreate(true);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={() => {
          setShowCreate(false);
          setShowBrowser(true);
        }}
      />
    </>
  );
}
