'use client';

import { useGlobalShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { KeyboardShortcutsModal } from '@/components/ui/keyboard-shortcuts-modal';

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useGlobalShortcuts();
  
  return (
    <>
      {children}
      <KeyboardShortcutsModal />
    </>
  );
}
