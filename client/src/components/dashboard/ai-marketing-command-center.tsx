import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AutomationJob {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  schedule?: any;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface AutomationCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  aiGenerated: boolean;
  metrics?: any;
  createdAt: string;
}

interface AutomatedTask {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledFor: string;
  executedAt?: string;
  aiGenerated: boolean;
}

export default function AIMarketingCommandCenter() {
  const [selectedJobType, setSelectedJobType] = useState<string>('');
  const [jobName, setJobName] = useState('');
  const [automationConfig, setAutomationConfig] = useState({
    frequency: 'weekly',
    platforms: [] as string[],
    tone: 'professional',
    budget: 500
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch automation data
  const { data: jobs = [] } = useQuery<AutomationJob[]>({
    queryKey: ['/api/automation/jobs'],
  });

  const { data: campaigns = [] } = useQuery<AutomationCampaign[]>({
    queryKey: ['/api/automation/campaigns'],
  });

  const { data: tasks = [] } = useQuery<AutomatedTask[]>({
    queryKey: ['/api/automation/tasks'],
  });

  // Create automation job mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      await apiRequest('POST', '/api/automation/jobs', jobData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/jobs'] });
      toast({
        title: "Automation Created",
        description: "Your AI automation job has been created and is now active.",
      });
      setJobName('');
      setSelectedJobType('');
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create automation job. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Control job mutations
  const pauseJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest('PUT', `/api/automation/jobs/${jobId}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/jobs'] });
      toast({ title: "Job Paused", description: "Automation job has been paused." });
    },
  });

  const resumeJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest('PUT', `/api/automation/jobs/${jobId}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/jobs'] });
      toast({ title: "Job Resumed", description: "Automation job has been resumed." });
    },
  });

  const executeJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest('POST', `/api/automation/jobs/${jobId}/execute`);
    },
    onSuccess: () => {
      toast({ title: "Job Started", description: "Automation job execution has started." });
    },
  });

  const handleCreateJob = () => {
    if (!jobName || !selectedJobType) {
      toast({
        title: "Missing Information",
        description: "Please provide a job name and select an automation type.",
        variant: "destructive",
      });
      return;
    }

    const config = {
      type: selectedJobType,
      schedule: {
        frequency: automationConfig.frequency,
        timeOfDay: '09:00'
      },
      preferences: {
        tone: automationConfig.tone,
        platforms: automationConfig.platforms,
        budget: automationConfig.budget
      }
    };

    createJobMutation.mutate({
      name: jobName,
      type: selectedJobType,
      config
    });
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'marketing_schedule': return Icons.alert;
      case 'radio_outreach': return Icons.shoppingCart;
      case 'sync_licensing': return Icons.alert;
      case 'grant_search': return Icons.user;
      case 'content_calendar': return Icons.alert;
      default: return Icons.alert;
    }
  };

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'marketing_schedule': return 'Marketing Automation';
      case 'radio_outreach': return 'Radio Station Outreach';
      case 'sync_licensing': return 'Sync Licensing Campaigns';
      case 'grant_search': return 'Grant Discovery';
      case 'content_calendar': return 'Content Calendar';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeJobs = jobs.filter(job => job.status === 'active').length;
  const totalCampaigns = campaigns.length;
  const scheduledTasks = tasks.filter(task => task.status === 'scheduled').length;
  const successRate = jobs.length > 0 ? Math.round((jobs.reduce((sum, job) => sum + job.successCount, 0) / jobs.reduce((sum, job) => sum + job.runCount, 0)) * 100) || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Marketing Command Center</h2>
          <p className="text-gray-600">Intelligent automation for all your promotional activities</p>
        </div>
        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          🤖 AI Powered
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-green-600">{activeJobs}</p>
              </div>
              <Icons.alert className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Campaigns</p>
                <p className="text-2xl font-bold text-blue-600">{totalCampaigns}</p>
              </div>
              <Icons.shoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled Tasks</p>
                <p className="text-2xl font-bold text-purple-600">{scheduledTasks}</p>
              </div>
              <Icons.user className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-emerald-600">{successRate}%</p>
              </div>
              <Progress value={successRate} className="w-12 h-12" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="automations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="campaigns">AI Campaigns</TabsTrigger>
          <TabsTrigger value="tasks">Scheduled Tasks</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="automations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.alert className="h-5 w-5" />
                Active Automation Jobs
              </CardTitle>
              <CardDescription>
                Manage your AI-powered marketing automations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.map((job) => {
                  const Icon = getJobTypeIcon(job.type);
                  return (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium">{job.name}</h4>
                          <p className="text-sm text-gray-600">{getJobTypeLabel(job.type)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(job.status)}>
                              {job.status}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {job.runCount} runs • {job.successCount} success
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeJobMutation.mutate(job.id)}
                          disabled={executeJobMutation.isPending}
                        >
                          Run Now
                        </Button>
                        {job.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pauseJobMutation.mutate(job.id)}
                            disabled={pauseJobMutation.isPending}
                          >
                            Pause
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => resumeJobMutation.mutate(job.id)}
                            disabled={resumeJobMutation.isPending}
                          >
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {jobs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.alert className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No automation jobs yet. Create your first AI automation!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.shoppingCart className="h-5 w-5" />
                AI-Generated Campaigns
              </CardTitle>
              <CardDescription>
                Campaigns automatically created by your AI automations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{campaign.name}</h4>
                      <p className="text-sm text-gray-600">{campaign.type.replace('_', ' ')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        {campaign.aiGenerated && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                ))}
                {campaigns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.shoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No AI campaigns yet. Your automations will create campaigns automatically!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.user className="h-5 w-5" />
                Scheduled Tasks
              </CardTitle>
              <CardDescription>
                Individual tasks scheduled by your AI automations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.slice(0, 10).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-gray-600">{task.type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">
                        Scheduled: {new Date(task.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                      {task.aiGenerated && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          AI
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.user className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No scheduled tasks yet. Your automations will create tasks automatically!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.alert className="h-5 w-5" />
                Create New Automation
              </CardTitle>
              <CardDescription>
                Set up intelligent AI automation for your marketing activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="jobName">Automation Name</Label>
                    <Input
                      id="jobName"
                      placeholder="e.g., Weekly Radio Outreach"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="jobType">Automation Type</Label>
                    <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select automation type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing_schedule">Marketing Automation</SelectItem>
                        <SelectItem value="radio_outreach">Radio Station Outreach</SelectItem>
                        <SelectItem value="sync_licensing">Sync Licensing Campaigns</SelectItem>
                        <SelectItem value="grant_search">Grant Discovery</SelectItem>
                        <SelectItem value="content_calendar">Content Calendar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select value={automationConfig.frequency} onValueChange={(value) => setAutomationConfig(prev => ({ ...prev, frequency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tone">Communication Tone</Label>
                    <Select value={automationConfig.tone} onValueChange={(value) => setAutomationConfig(prev => ({ ...prev, tone: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="budget">Budget (USD)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="500"
                      value={automationConfig.budget}
                      onChange={(e) => setAutomationConfig(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={handleCreateJob}
                      disabled={createJobMutation.isPending}
                      className="w-full"
                    >
                      {createJobMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Automation...
                        </>
                      ) : (
                        <>
                          <Icons.alert className="w-4 h-4 mr-2" />
                          Create AI Automation
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Automation Type Descriptions */}
              {selectedJobType && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">
                    {getJobTypeLabel(selectedJobType)}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {selectedJobType === 'marketing_schedule' && 'AI analyzes your content and creates comprehensive marketing campaigns with optimized scheduling, platform targeting, and audience analysis.'}
                    {selectedJobType === 'radio_outreach' && 'Automatically generates personalized pitches for radio stations, schedules follow-ups, and tracks response rates for maximum effectiveness.'}
                    {selectedJobType === 'sync_licensing' && 'Analyzes your music for sync opportunities, matches with appropriate supervisors, and creates targeted licensing pitches.'}
                    {selectedJobType === 'grant_search' && 'Continuously searches for relevant grants, analyzes eligibility requirements, and creates application timelines and materials.'}
                    {selectedJobType === 'content_calendar' && 'Generates a strategic content calendar with platform-optimized posts, optimal timing, and cross-promotional opportunities.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}