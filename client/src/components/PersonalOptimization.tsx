import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Settings, 
  Target, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Zap,
  BookOpen,
  Phone,
  Music
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserPreferences {
  id: string;
  userId: string;
  dashboardLayout: {
    quickActions?: { visible: boolean; order: number };
    aiAssistant?: { visible: boolean; order: number };
    carenMetrics?: { visible: boolean; order: number };
    recentTasks?: { visible: boolean; order: number };
  };
  quickActionButtons: string[];
  preferredTasks: string[];
  carenMetrics: {
    showFundingProgress?: boolean;
    showInvestorCount?: boolean;
    showMilestones?: boolean;
    preferredChart?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CarenProject {
  id: string;
  userId: string;
  projectName: string;
  currentPhase: string;
  investorContacts: number;
  grantApplications: number;
  developmentProgress: number;
  fundraisingGoal: string | null;
  currentFunding: string;
  nextMilestone: string | null;
  milestoneDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const quickActionIcons = {
  create_task: CheckCircle2,
  find_grants: DollarSign,
  add_contact: Users,
  music_sync: Music,
  ai_assistant: Zap,
  knowledge_base: BookOpen,
  call_investor: Phone,
};

export function PersonalOptimization() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Fetch user preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
  });

  // Fetch C.A.R.E.N. project data
  const { data: carenProject, isLoading: projectLoading } = useQuery<CarenProject>({
    queryKey: ["/api/caren/project"],
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      return apiRequest("PUT", "/api/user/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Preferences Updated",
        description: "Your personal optimization settings have been saved.",
      });
      setIsCustomizing(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update your preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update C.A.R.E.N. project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Partial<CarenProject>) => {
      return apiRequest("PUT", "/api/caren/project", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caren/project"] });
      toast({
        title: "Project Updated",
        description: "C.A.R.E.N. project tracking has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update C.A.R.E.N. project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create_task':
        // Navigate to tasks page or open task creation modal
        window.location.href = '/tasks';
        break;
      case 'find_grants':
        window.location.href = '/grants';
        break;
      case 'add_contact':
        window.location.href = '/contacts';
        break;
      case 'music_sync':
        window.location.href = '/music';
        break;
      case 'ai_assistant':
        window.location.href = '/ai-assistant';
        break;
      case 'knowledge_base':
        window.location.href = '/knowledge';
        break;
      default:
        toast({
          title: "Feature Coming Soon",
          description: `${action} functionality will be available soon.`,
        });
    }
  };

  if (preferencesLoading || projectLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const fundingProgress = carenProject ? 
    (parseFloat(carenProject.currentFunding) / parseFloat(carenProject.fundraisingGoal || '250000')) * 100 
    : 0;

  const daysToMilestone = carenProject?.milestoneDate ? 
    Math.ceil((new Date(carenProject.milestoneDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Header with customization toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Personal Dashboard</h1>
          <p className="text-muted-foreground">
            Optimized for your C.A.R.E.N. project workflow
          </p>
        </div>
        <Button
          onClick={() => setIsCustomizing(!isCustomizing)}
          variant={isCustomizing ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          {isCustomizing ? "Done" : "Customize"}
        </Button>
      </div>

      {/* Quick Action Buttons */}
      {preferences?.dashboardLayout.quickActions?.visible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {preferences.quickActionButtons.map((action) => {
                const Icon = quickActionIcons[action as keyof typeof quickActionIcons] || CheckCircle2;
                return (
                  <Button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto p-4"
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs capitalize">
                      {action.replace('_', ' ')}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* C.A.R.E.N. Project Metrics */}
      {preferences?.dashboardLayout.carenMetrics?.visible && carenProject && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Development Progress</p>
                  <p className="text-2xl font-bold">{carenProject.developmentProgress}%</p>
                </div>
                <Target className="w-8 h-8 text-primary" />
              </div>
              <Progress value={carenProject.developmentProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Funding Progress</p>
                  <p className="text-2xl font-bold">${parseFloat(carenProject.currentFunding).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Goal: ${parseFloat(carenProject.fundraisingGoal || '250000').toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <Progress value={fundingProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Investor Contacts</p>
                  <p className="text-2xl font-bold">{carenProject.investorContacts}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Grant Applications</p>
                  <p className="text-2xl font-bold">{carenProject.grantApplications}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next Milestone */}
      {carenProject?.nextMilestone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Next Milestone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{carenProject.nextMilestone}</p>
                <p className="text-sm text-muted-foreground">
                  {carenProject.currentPhase}
                </p>
              </div>
              <div className="text-right">
                {daysToMilestone !== null && (
                  <Badge variant={daysToMilestone <= 7 ? "destructive" : "default"}>
                    {daysToMilestone > 0 ? `${daysToMilestone} days remaining` : "Overdue"}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferred Tasks Overview */}
      {preferences?.preferredTasks && preferences.preferredTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {preferences.preferredTasks.map((task, index) => (
                <Badge key={index} variant="secondary">
                  {task}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customization Panel */}
      {isCustomizing && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Customize Your Dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              This feature allows you to personalize your workflow. More customization options coming soon.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <p className="text-sm">
                Dashboard customization features are being enhanced. Current layout is optimized for your C.A.R.E.N. project workflow.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}