import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '../Button';

interface ThemeToggleProps {
  variant?: 'dropdown' | 'toggle';
  size?: 'sm' | 'md';
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

export function ThemeToggle({ variant = 'dropdown', size = 'sm', theme, onThemeChange }: ThemeToggleProps) {
  if (variant === 'toggle') {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
      <Button
        variant="ghost"
        size={size}
        onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
        className="theme-toggle__button"
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </Button>
    );
  }

  return (
    <div className="theme-toggle">
      <Button
        variant={theme === 'light' ? 'primary' : 'ghost'}
        size={size}
        onClick={() => onThemeChange('light')}
        className="theme-toggle__option"
        title="Light mode"
      >
        <Sun size={16} />
      </Button>
      <Button
        variant={theme === 'dark' ? 'primary' : 'ghost'}
        size={size}
        onClick={() => onThemeChange('dark')}
        className="theme-toggle__option"
        title="Dark mode"
      >
        <Moon size={16} />
      </Button>
      <Button
        variant={theme === 'system' ? 'primary' : 'ghost'}
        size={size}
        onClick={() => onThemeChange('system')}
        className="theme-toggle__option"
        title="System preference"
      >
        <Monitor size={16} />
      </Button>
    </div>
  );
}

export default ThemeToggle;
