import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/lib/icons';
import { useVoiceCommands } from '@/contexts/VoiceCommandContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VoiceCommandButtonProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showLabel?: boolean;
}

export function VoiceCommandButton({ 
  className, 
  size = 'default', 
  variant = 'ghost',
  showLabel = false 
}: VoiceCommandButtonProps) {
  const { 
    isListening, 
    isSupported, 
    isEnabled, 
    toggleListening, 
    setEnabled,
    lastCommand 
  } = useVoiceCommands();

  const [showPulse, setShowPulse] = useState(false);

  // Show pulse animation when listening
  useEffect(() => {
    if (isListening) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowPulse(false);
    }
  }, [isListening]);

  if (!isSupported) {
    return null; // Don't show button if speech recognition is not supported
  }

  const handleClick = () => {
    if (!isEnabled) {
      setEnabled(true);
    } else {
      toggleListening();
    }
  };

  const getTooltipContent = () => {
    if (!isEnabled) return "Enable voice commands";
    if (isListening) return "Listening... Tap to stop";
    return "Tap to start voice commands";
  };

  const getButtonText = () => {
    if (!isEnabled) return "Enable Voice";
    if (isListening) return "Listening...";
    return "Voice Commands";
  };

  const getIconComponent = () => {
    if (isListening) {
      return <Icons.micOff className={cn("h-4 w-4", showPulse && "animate-pulse")} />;
    }
    if (!isEnabled) {
      return <Icons.micOff className="h-4 w-4 opacity-50" />;
    }
    return <Icons.mic className="h-4 w-4" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={cn(
              "relative transition-all duration-200",
              isListening && "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800",
              !isEnabled && "opacity-50",
              showPulse && "animate-pulse",
              className
            )}
          >
            {/* Listening indicator ring */}
            {isListening && (
              <div className="absolute inset-0 rounded-md border-2 border-red-400 animate-ping" />
            )}
            
            {getIconComponent()}
            
            {showLabel && (
              <span className="ml-2 text-sm font-medium">
                {getButtonText()}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{getTooltipContent()}</p>
            {lastCommand && (
              <p className="text-xs text-muted-foreground">
                Last: "{lastCommand}"
              </p>
            )}
            {isEnabled && !isListening && (
              <div className="text-xs text-muted-foreground mt-2">
                <p>Try saying:</p>
                <p>• "Go home"</p>
                <p>• "Add new audiobook"</p>
                <p>• "Hey Sunshine"</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Floating voice command button for mobile
export function FloatingVoiceButton() {
  const { 
    isListening, 
    isSupported, 
    isEnabled, 
    toggleListening 
  } = useVoiceCommands();

  if (!isSupported || !isEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              onClick={toggleListening}
              className={cn(
                "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
                isListening 
                  ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isListening ? (
                <Icons.micOff className="h-6 w-6 text-white" />
              ) : (
                <Icons.mic className="h-6 w-6 text-white" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{isListening ? "Stop listening" : "Start voice commands"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}