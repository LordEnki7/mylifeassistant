import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'auto' | 'light' | 'dark' | 'dawn' | 'dusk';
export type TimeBasedTheme = 'dawn' | 'day' | 'dusk' | 'night';

interface ThemeContextType {
  mode: ThemeMode;
  actualTheme: TimeBasedTheme;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const getTimeBasedTheme = (): TimeBasedTheme => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 8) return 'dawn';     // 5AM - 8AM: Dawn
  if (hour >= 8 && hour < 18) return 'day';     // 8AM - 6PM: Day
  if (hour >= 18 && hour < 21) return 'dusk';   // 6PM - 9PM: Dusk
  return 'night';                                // 9PM - 5AM: Night
};

const applyTheme = (theme: TimeBasedTheme) => {
  const root = document.documentElement;
  
  // Remove all theme classes
  root.classList.remove('light', 'dark', 'dawn', 'dusk', 'day', 'night');
  
  // Apply the new theme class
  root.classList.add(theme);
  
  // For dark/light compatibility, also add the appropriate base theme
  if (theme === 'night') {
    root.classList.add('dark');
  } else if (theme === 'day') {
    root.classList.add('light');
  }
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [actualTheme, setActualTheme] = useState<TimeBasedTheme>(getTimeBasedTheme());

  // Load saved theme mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedMode && ['auto', 'light', 'dark', 'dawn', 'dusk'].includes(savedMode)) {
      setMode(savedMode);
    }
  }, []);

  // Update actual theme based on mode
  useEffect(() => {
    let newTheme: TimeBasedTheme;

    switch (mode) {
      case 'light':
        newTheme = 'day';
        break;
      case 'dark':
        newTheme = 'night';
        break;
      case 'dawn':
        newTheme = 'dawn';
        break;
      case 'dusk':
        newTheme = 'dusk';
        break;
      case 'auto':
      default:
        newTheme = getTimeBasedTheme();
        break;
    }

    setActualTheme(newTheme);
    applyTheme(newTheme);
  }, [mode]);

  // Auto theme update every minute when in auto mode
  useEffect(() => {
    if (mode === 'auto') {
      const interval = setInterval(() => {
        const newTheme = getTimeBasedTheme();
        if (newTheme !== actualTheme) {
          setActualTheme(newTheme);
          applyTheme(newTheme);
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [mode, actualTheme]);

  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  const isDark = actualTheme === 'night' || actualTheme === 'dusk';

  return (
    <ThemeContext.Provider
      value={{
        mode,
        actualTheme,
        setMode: handleSetMode,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};