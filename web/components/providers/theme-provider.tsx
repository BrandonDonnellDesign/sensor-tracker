'use client';

import { createContext, useContext, useEffect } from 'react';

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => { },
  actualTheme: 'dark',
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always force dark theme
  const theme: Theme = 'dark';
  const actualTheme: 'dark' = 'dark';

  // No-op setter since we only support dark mode now
  const setTheme = () => { };

  useEffect(() => {
    // Force dark class on document root
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');

    // Optional: Clear any saved theme preference to avoid confusion if we ever revert
    localStorage.removeItem('theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}