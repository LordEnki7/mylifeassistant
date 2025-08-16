import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { VoiceCommandProvider } from "@/contexts/VoiceCommandContext";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/My Life Assistant_1755255862503.png";
import LoginScreen from "@/components/auth/login-screen";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Outreach from "@/pages/outreach";
import Radio from "@/pages/radio";
import Licensing from "@/pages/licensing";
import Grants from "@/pages/grants";
import Calendar from "@/pages/calendar";
import Invoices from "@/pages/invoices";
import Knowledge from "@/pages/knowledge";
import Contracts from "@/pages/contracts";
import Audiobooks from "@/pages/audiobooks";
import AudiobookPromotion from "@/pages/audiobook-promotion";
import AppShell from "@/components/layout/app-shell";
import { FloatingVoiceButton } from "@/components/ui/voice-command-button";

function AuthenticatedApp() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/outreach" component={Outreach} />
        <Route path="/radio" component={Radio} />
        <Route path="/licensing" component={Licensing} />
        <Route path="/grants" component={Grants} />
        <Route path="/contracts" component={Contracts} />
        <Route path="/audiobooks" component={Audiobooks} />
        <Route path="/audiobook-promotion" component={AudiobookPromotion} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/knowledge" component={Knowledge} />
        <Route component={NotFound} />
      </Switch>
      <FloatingVoiceButton />
    </AppShell>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <img src={logoImage} alt="My Life Assistant" className="h-20 w-20 mx-auto mb-4" />
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">My Life Assistant</h2>
        <p className="text-gray-600">Initializing your personal assistant...</p>
      </div>
    </div>
  );
}

function Router() {
  const { isLoading, isAuthenticated, error } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated or if there's an authentication error
  if (!isAuthenticated || error) {
    return <LoginScreen />;
  }

  // Show authenticated app
  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <VoiceCommandProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </VoiceCommandProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
