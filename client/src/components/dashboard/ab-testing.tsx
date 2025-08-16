import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ABTestCampaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  testType: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  startDate?: string;
  endDate?: string;
  sampleSize?: number;
  confidenceLevel?: number;
  results?: any;
  createdAt: string;
}

interface ABTestVariant {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  config: any;
  trafficPercentage: number;
  isControl: boolean;
  createdAt: string;
}

interface ABTestResult {
  id: string;
  campaignId: string;
  variantId: string;
  metric: string;
  value: string;
  sampleSize: number;
  conversionRate?: string;
  confidenceInterval?: string;
  statisticalSignificance?: number;
  createdAt: string;
}

export default function ABTesting() {
  const [selectedTestType, setSelectedTestType] = useState<string>('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [sampleSize, setSampleSize] = useState('1000');
  const [confidenceLevel, setConfidenceLevel] = useState('95');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch A/B test campaigns
  const { data: campaigns = [] } = useQuery<ABTestCampaign[]>({
    queryKey: ['/api/ab-testing/campaigns'],
  });

  // Fetch variants for selected campaign
  const { data: variants = [] } = useQuery<ABTestVariant[]>({
    queryKey: ['/api/ab-testing/variants'],
  });

  // Fetch test results
  const { data: results = [] } = useQuery<ABTestResult[]>({
    queryKey: ['/api/ab-testing/results'],
  });

  // Create A/B test campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      await apiRequest('POST', '/api/ab-testing/campaigns', campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ab-testing/campaigns'] });
      toast({
        title: "A/B Test Created",
        description: "Your A/B test campaign has been created successfully.",
      });
      setCampaignName('');
      setCampaignDescription('');
      setSelectedTestType('');
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create A/B test campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Start/stop campaign mutations
  const startCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      await apiRequest('PUT', `/api/ab-testing/campaigns/${campaignId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ab-testing/campaigns'] });
      toast({ title: "Test Started", description: "A/B test campaign is now running." });
    },
  });

  const stopCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      await apiRequest('PUT', `/api/ab-testing/campaigns/${campaignId}/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ab-testing/campaigns'] });
      toast({ title: "Test Stopped", description: "A/B test campaign has been stopped." });
    },
  });

  // Generate results mutation
  const generateResultsMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      await apiRequest('POST', `/api/ab-testing/campaigns/${campaignId}/generate-results`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ab-testing/results'] });
      toast({ title: "Results Generated", description: "A/B test results have been generated." });
    },
  });

  const handleCreateCampaign = () => {
    if (!campaignName || !selectedTestType) {
      toast({
        title: "Missing Information",
        description: "Please provide a campaign name and select a test type.",
        variant: "destructive",
      });
      return;
    }

    createCampaignMutation.mutate({
      name: campaignName,
      description: campaignDescription,
      testType: selectedTestType,
      sampleSize: parseInt(sampleSize) || 1000,
      confidenceLevel: parseInt(confidenceLevel) || 95,
    });
  };

  const getTestTypeIcon = (type: string) => {
    switch (type) {
      case 'email_subject': return Icons.alert;
      case 'landing_page': return Icons.shoppingCart;
      case 'call_to_action': return Icons.user;
      case 'radio_pitch': return Icons.alert;
      case 'content_variation': return Icons.alert;
      default: return Icons.alert;
    }
  };

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'email_subject': return 'Email Subject Lines';
      case 'landing_page': return 'Landing Page Design';
      case 'call_to_action': return 'Call-to-Action Buttons';
      case 'radio_pitch': return 'Radio Pitch Variations';
      case 'content_variation': return 'Content Variations';
      default: return type.replace('_', ' ');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const runningTests = campaigns.filter(c => c.status === 'running').length;
  const completedTests = campaigns.filter(c => c.status === 'completed').length;
  const totalVariants = variants.length;
  const averageConfidence = results.length > 0 ? 
    Math.round(results.reduce((sum, r) => sum + (r.statisticalSignificance || 0), 0) / results.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">A/B Testing Lab</h2>
          <p className="text-gray-600">Optimize your marketing with data-driven experiments</p>
        </div>
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
          🧪 Statistical Analysis
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Running Tests</p>
                <p className="text-2xl font-bold text-green-600">{runningTests}</p>
              </div>
              <Icons.alert className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Tests</p>
                <p className="text-2xl font-bold text-blue-600">{completedTests}</p>
              </div>
              <Icons.shoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Test Variants</p>
                <p className="text-2xl font-bold text-purple-600">{totalVariants}</p>
              </div>
              <Icons.user className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Confidence</p>
                <p className="text-2xl font-bold text-emerald-600">{averageConfidence}%</p>
              </div>
              <Progress value={averageConfidence} className="w-12 h-12" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns">Test Campaigns</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="create">Create Test</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.alert className="h-5 w-5" />
                A/B Test Campaigns
              </CardTitle>
              <CardDescription>
                Manage your ongoing and completed A/B tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const Icon = getTestTypeIcon(campaign.testType);
                  return (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-purple-500" />
                        <div>
                          <h4 className="font-medium">{campaign.name}</h4>
                          <p className="text-sm text-gray-600">{getTestTypeLabel(campaign.testType)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Sample: {campaign.sampleSize} • Confidence: {campaign.confidenceLevel}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.status === 'running' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateResultsMutation.mutate(campaign.id)}
                              disabled={generateResultsMutation.isPending}
                            >
                              Get Results
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => stopCampaignMutation.mutate(campaign.id)}
                              disabled={stopCampaignMutation.isPending}
                            >
                              Stop Test
                            </Button>
                          </>
                        ) : campaign.status === 'draft' ? (
                          <Button
                            size="sm"
                            onClick={() => startCampaignMutation.mutate(campaign.id)}
                            disabled={startCampaignMutation.isPending}
                          >
                            Start Test
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            View Results
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {campaigns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.alert className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No A/B tests yet. Create your first experiment!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.shoppingCart className="h-5 w-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                Statistical analysis and performance data from your A/B tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{result.metric}</h4>
                      <Badge className={
                        (result.statisticalSignificance || 0) > 95 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {result.statisticalSignificance || 0}% Confidence
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Value</p>
                        <p className="font-medium">{result.value}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sample Size</p>
                        <p className="font-medium">{result.sampleSize}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Conversion Rate</p>
                        <p className="font-medium">{result.conversionRate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Confidence Interval</p>
                        <p className="font-medium">{result.confidenceInterval || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.shoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No test results yet. Run some A/B tests to see results!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.user className="h-5 w-5" />
                Test Variants
              </CardTitle>
              <CardDescription>
                Different versions being tested in your experiments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {variants.map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{variant.name}</h4>
                      <p className="text-sm text-gray-600">{variant.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {variant.isControl && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            Control
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          Traffic: {variant.trafficPercentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={variant.trafficPercentage} className="w-20" />
                  </div>
                ))}
                {variants.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.user className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No variants created yet. Add variants to your A/B tests!</p>
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
                Create A/B Test
              </CardTitle>
              <CardDescription>
                Set up a new experiment to optimize your marketing performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="campaignName">Test Name</Label>
                    <Input
                      id="campaignName"
                      placeholder="e.g., Email Subject Line Test"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="testType">Test Type</Label>
                    <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email_subject">Email Subject Lines</SelectItem>
                        <SelectItem value="landing_page">Landing Page Design</SelectItem>
                        <SelectItem value="call_to_action">Call-to-Action Buttons</SelectItem>
                        <SelectItem value="radio_pitch">Radio Pitch Variations</SelectItem>
                        <SelectItem value="content_variation">Content Variations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="campaignDescription">Description</Label>
                    <Textarea
                      id="campaignDescription"
                      placeholder="Describe what you're testing and why..."
                      value={campaignDescription}
                      onChange={(e) => setCampaignDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sampleSize">Sample Size</Label>
                    <Input
                      id="sampleSize"
                      type="number"
                      placeholder="1000"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confidenceLevel">Confidence Level (%)</Label>
                    <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="95">95%</SelectItem>
                        <SelectItem value="99">99%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={handleCreateCampaign}
                      disabled={createCampaignMutation.isPending}
                      className="w-full"
                    >
                      {createCampaignMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Test...
                        </>
                      ) : (
                        <>
                          <Icons.alert className="w-4 h-4 mr-2" />
                          Create A/B Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Test Type Descriptions */}
              {selectedTestType && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">
                    {getTestTypeLabel(selectedTestType)}
                  </h4>
                  <p className="text-sm text-purple-700">
                    {selectedTestType === 'email_subject' && 'Test different email subject lines to optimize open rates and engagement across your marketing campaigns.'}
                    {selectedTestType === 'landing_page' && 'Compare different landing page designs, layouts, or content to improve conversion rates and user engagement.'}
                    {selectedTestType === 'call_to_action' && 'Test various call-to-action buttons, colors, text, and placement to maximize click-through rates.'}
                    {selectedTestType === 'radio_pitch' && 'Compare different radio pitch approaches and messaging to improve response rates from stations.'}
                    {selectedTestType === 'content_variation' && 'Test different content variations across platforms to determine what resonates best with your audience.'}
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