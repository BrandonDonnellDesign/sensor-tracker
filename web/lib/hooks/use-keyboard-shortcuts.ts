import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
}

// Global shortcuts hook
export function useGlobalShortcuts() {
  const router = useRouter();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'h',
      description: 'Go to Dashboard',
      action: () => router.push('/dashboard'),
    },
    {
      key: 'f',
      description: 'Go to Food',
      action: () => router.push('/dashboard/food'),
    },
    {
      key: 'i',
      description: 'Go to Insulin',
      action: () => router.push('/dashboard/insulin'),
    },
    {
      key: 's',
      description: 'Go to Sensors',
      action: () => router.push('/dashboard/sensors'),
    },
    {
      key: 'g',
      description: 'Go to Glucose Data',
      action: () => router.push('/dashboard/glucose-data'),
    },
    {
      key: 'a',
      description: 'Go to Analytics',
      action: () => router.push('/dashboard/analytics'),
    },
    {
      key: ',',
      description: 'Go to Settings',
      action: () => router.push('/dashboard/settings'),
    },
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      action: () => {
        // Will be handled by the shortcuts modal
        window.dispatchEvent(new CustomEvent('show-shortcuts'));
      },
    },
    {
      key: 'k',
      ctrl: true,
      description: 'Quick search',
      action: () => router.push('/dashboard/search'),
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
