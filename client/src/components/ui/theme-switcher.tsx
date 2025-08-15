import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/lib/icons';

const themeOptions: { mode: ThemeMode; label: string; icon: keyof typeof Icons; description: string }[] = [
  {
    mode: 'auto',
    label: 'Smart Auto',
    icon: 'clock',
    description: 'Changes based on time of day'
  },
  {
    mode: 'light',
    label: 'Light',
    icon: 'sun',
    description: 'Bright and clear'
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: 'moon',
    description: 'Easy on the eyes'
  },
  {
    mode: 'dawn',
    label: 'Dawn',
    icon: 'sunrise',
    description: 'Warm morning colors'
  },
  {
    mode: 'dusk',
    label: 'Dusk',
    icon: 'sunset',
    description: 'Soft evening tones'
  },
];

export function ThemeSwitcher() {
  const { mode, actualTheme, setMode } = useTheme();
  
  const currentOption = themeOptions.find(option => option.mode === mode) || themeOptions[0];
  const CurrentIcon = Icons[currentOption.icon];

  const getTimeBasedDescription = () => {
    const timeDescriptions = {
      dawn: 'Dawn Theme - Warm sunrise colors',
      day: 'Day Theme - Bright and clear',
      dusk: 'Dusk Theme - Soft evening tones',
      night: 'Night Theme - Dark and comfortable'
    };
    
    if (mode === 'auto') {
      return `Auto Mode: Currently using ${timeDescriptions[actualTheme]}`;
    }
    
    return currentOption.description;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium">
          Theme Settings
        </div>
        <div className="px-2 py-1 text-xs text-muted-foreground mb-1">
          {getTimeBasedDescription()}
        </div>
        {themeOptions.map((option) => {
          const OptionIcon = Icons[option.icon];
          return (
            <DropdownMenuItem
              key={option.mode}
              onClick={() => setMode(option.mode)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center">
                <OptionIcon className="mr-2 h-4 w-4" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </div>
              {mode === option.mode && (
                <Icons.checkCircle className="h-4 w-4" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}