import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import AppShell from "@/components/layout/app-shell";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/chat" component={Chat} />
      <Route path="/outreach" component={Outreach} />
      <Route path="/radio" component={Radio} />
      <Route path="/licensing" component={Licensing} />
      <Route path="/grants" component={Grants} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/knowledge" component={Knowledge} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppShell>
          <Router />
        </AppShell>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
