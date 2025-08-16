import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceCommand {
  patterns: string[];
  action: string;
  description: string;
  requiresParam?: boolean;
}

interface VoiceCommandContextType {
  isListening: boolean;
  isSupported: boolean;
  isEnabled: boolean;
  lastCommand: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  setEnabled: (enabled: boolean) => void;
  processCommand: (command: string) => void;
}

const VoiceCommandContext = createContext<VoiceCommandContextType | undefined>(undefined);

export const useVoiceCommands = () => {
  const context = useContext(VoiceCommandContext);
  if (context === undefined) {
    throw new Error('useVoiceCommands must be used within a VoiceCommandProvider');
  }
  return context;
};

interface VoiceCommandProviderProps {
  children: ReactNode;
}

// Voice command definitions
const voiceCommands: VoiceCommand[] = [
  // Navigation commands
  { patterns: ['go home', 'home page', 'dashboard'], action: 'navigate:/', description: 'Go to home page' },
  { patterns: ['go to audiobooks', 'audiobooks page', 'my audiobooks'], action: 'navigate:/audiobooks', description: 'Open audiobooks page' },
  { patterns: ['go to promotion', 'promotion page', 'marketing'], action: 'navigate:/audiobook-promotion', description: 'Open promotion page' },
  { patterns: ['go to contracts', 'contracts page', 'legal contracts'], action: 'navigate:/contracts', description: 'Open contracts page' },
  { patterns: ['go to grants', 'grants page', 'funding'], action: 'navigate:/grants', description: 'Open grants page' },
  { patterns: ['go to contacts', 'contacts page', 'address book'], action: 'navigate:/contacts', description: 'Open contacts page' },
  { patterns: ['go to invoices', 'invoices page', 'billing'], action: 'navigate:/invoices', description: 'Open invoices page' },
  { patterns: ['go to calendar', 'calendar page', 'events'], action: 'navigate:/calendar', description: 'Open calendar page' },
  { patterns: ['go to knowledge', 'knowledge page', 'notes'], action: 'navigate:/knowledge', description: 'Open knowledge page' },
  
  // Action commands
  { patterns: ['add new audiobook', 'create audiobook', 'new book'], action: 'action:add-audiobook', description: 'Open add audiobook dialog' },
  { patterns: ['create campaign', 'new campaign', 'marketing campaign'], action: 'action:new-campaign', description: 'Create new promotion campaign' },
  { patterns: ['add contact', 'new contact', 'create contact'], action: 'action:add-contact', description: 'Add new contact' },
  { patterns: ['create invoice', 'new invoice', 'bill client'], action: 'action:new-invoice', description: 'Create new invoice' },
  { patterns: ['add event', 'new event', 'schedule meeting'], action: 'action:add-event', description: 'Add calendar event' },
  { patterns: ['find grants', 'search grants', 'grant search'], action: 'action:find-grants', description: 'Search for grants with AI' },
  
  // AI commands
  { patterns: ['hey sunshine', 'ask sunshine', 'sunshine help'], action: 'ai:activate', description: 'Activate AI assistant' },
  { patterns: ['create task', 'new task', 'add reminder'], action: 'ai:create-task', description: 'Create task with AI' },
  
  // System commands
  { patterns: ['switch theme', 'change theme', 'toggle theme'], action: 'system:toggle-theme', description: 'Switch app theme' },
  { patterns: ['go back', 'navigate back', 'previous page'], action: 'system:back', description: 'Go to previous page' },
  { patterns: ['refresh page', 'reload page', 'refresh'], action: 'system:refresh', description: 'Refresh current page' },
  { patterns: ['help', 'voice help', 'what can you do'], action: 'system:help', description: 'Show voice commands help' },
  { patterns: ['stop listening', 'turn off voice', 'disable voice'], action: 'system:stop-voice', description: 'Stop voice recognition' },
];

export const VoiceCommandProvider = ({ children }: VoiceCommandProviderProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [lastCommand, setLastCommand] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          const command = event.results[0][0].transcript.toLowerCase().trim();
          setLastCommand(command);
          processCommand(command);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to use voice commands.",
              variant: "destructive",
            });
          }
        };

        setRecognition(recognition);
      } else {
        console.warn('Speech recognition not supported in this browser');
      }
    }

    // Load enabled state from localStorage
    const savedEnabled = localStorage.getItem('voice-commands-enabled');
    if (savedEnabled !== null) {
      setIsEnabled(JSON.parse(savedEnabled));
    }
  }, [toast]);

  const startListening = useCallback(() => {
    if (recognition && isSupported && isEnabled) {
      try {
        recognition.start();
        toast({
          title: "Voice Commands Active",
          description: "Listening for your command...",
          duration: 2000,
        });
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  }, [recognition, isSupported, isEnabled, toast]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleSetEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem('voice-commands-enabled', JSON.stringify(enabled));
    
    if (!enabled && isListening) {
      stopListening();
    }
    
    toast({
      title: enabled ? "Voice Commands Enabled" : "Voice Commands Disabled",
      description: enabled ? "You can now use voice commands" : "Voice commands are turned off",
    });
  }, [isListening, stopListening, toast]);

  const processCommand = useCallback((command: string) => {
    console.log('Processing voice command:', command);
    
    // Find matching command
    const matchedCommand = voiceCommands.find(cmd => 
      cmd.patterns.some(pattern => 
        command.includes(pattern) || 
        pattern.split(' ').every(word => command.includes(word))
      )
    );

    if (matchedCommand) {
      executeCommand(matchedCommand.action, command);
      toast({
        title: "Command Recognized",
        description: `Executing: ${matchedCommand.description}`,
        duration: 2000,
      });
    } else {
      // Try AI processing for unrecognized commands
      executeCommand('ai:process', command);
      toast({
        title: "Processing with AI",
        description: `"${command}"`,
        duration: 2000,
      });
    }
  }, [toast]);

  const executeCommand = useCallback((action: string, originalCommand: string) => {
    const [category, command] = action.split(':');

    switch (category) {
      case 'navigate':
        setLocation(command);
        break;

      case 'action':
        handleActionCommand(command);
        break;

      case 'ai':
        handleAICommand(command, originalCommand);
        break;

      case 'system':
        handleSystemCommand(command);
        break;

      default:
        console.warn('Unknown command category:', category);
    }
  }, [setLocation]);

  const handleActionCommand = (command: string) => {
    // Trigger custom events that components can listen to
    switch (command) {
      case 'add-audiobook':
        window.dispatchEvent(new CustomEvent('voice-action', { detail: { action: 'add-audiobook' } }));
        break;
      case 'new-campaign':
        window.dispatchEvent(new CustomEvent('voice-action', { detail: { action: 'new-campaign' } }));
        break;
      case 'add-contact':
        window.dispatchEvent(new CustomEvent('voice-action', { detail: { action: 'add-contact' } }));
        break;
      case 'new-invoice':
        window.dispatchEvent(new CustomEvent('voice-action', { detail: { action: 'new-invoice' } }));
        break;
      case 'add-event':
        window.dispatchEvent(new CustomEvent('voice-action', { detail: { action: 'add-event' } }));
        break;
      case 'find-grants':
        window.dispatchEvent(new CustomEvent('voice-action', { detail: { action: 'find-grants' } }));
        break;
    }
  };

  const handleAICommand = (command: string, originalCommand: string) => {
    switch (command) {
      case 'activate':
        window.dispatchEvent(new CustomEvent('voice-ai', { detail: { action: 'activate' } }));
        break;
      case 'create-task':
        window.dispatchEvent(new CustomEvent('voice-ai', { detail: { action: 'create-task', command: originalCommand } }));
        break;
      case 'process':
        window.dispatchEvent(new CustomEvent('voice-ai', { detail: { action: 'process', command: originalCommand } }));
        break;
    }
  };

  const handleSystemCommand = (command: string) => {
    switch (command) {
      case 'toggle-theme':
        window.dispatchEvent(new CustomEvent('voice-system', { detail: { action: 'toggle-theme' } }));
        break;
      case 'back':
        window.history.back();
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'help':
        showVoiceHelp();
        break;
      case 'stop-voice':
        handleSetEnabled(false);
        break;
    }
  };

  const showVoiceHelp = () => {
    const helpCommands = voiceCommands.slice(0, 8).map(cmd => `• "${cmd.patterns[0]}" - ${cmd.description}`).join('\n');
    toast({
      title: "Voice Commands Help",
      description: helpCommands,
      duration: 8000,
    });
  };

  return (
    <VoiceCommandContext.Provider
      value={{
        isListening,
        isSupported,
        isEnabled,
        lastCommand,
        startListening,
        stopListening,
        toggleListening,
        setEnabled: handleSetEnabled,
        processCommand,
      }}
    >
      {children}
    </VoiceCommandContext.Provider>
  );
};