import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Target, 
  ExternalLink, 
  Plus,
  Building,
  Heart,
  Briefcase,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CrowdfundingPlatform {
  id: string;
  name: string;
  type: 'equity' | 'rewards' | 'lending' | 'impact' | 'angel' | 'vc';
  description: string;
  amount?: string;
  deadline?: string;
  features?: string[];
  website: string;
  fit: string;
  maxRaise?: string;
  fees?: string;
  focus?: string[];
}

interface Campaign {
  id: string;
  platform: string;
  title: string;
  goal: number;
  raised: number;
  backers: number;
  status: 'draft' | 'active' | 'funded' | 'closed';
  deadline: string;
  description: string;
}

export default function Crowdfunding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    goal: '',
    description: '',
    deadline: ''
  });

  const { data: platforms, isLoading: platformsLoading } = useQuery({
    queryKey: ['/api/crowdfunding/platforms'],
    retry: false,
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/crowdfunding/campaigns'],
    retry: false,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return apiRequest('POST', '/api/crowdfunding/campaigns', campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crowdfunding/campaigns'] });
      toast({ title: "Campaign created successfully!" });
      setCampaignForm({ title: '', goal: '', description: '', deadline: '' });
    },
    onError: () => {
      toast({ 
        title: "Failed to create campaign", 
        variant: "destructive" 
      });
    }
  });

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform || !campaignForm.title || !campaignForm.goal) {
      toast({ 
        title: "Please fill in all required fields", 
        variant: "destructive" 
      });
      return;
    }

    createCampaignMutation.mutate({
      platform: selectedPlatform,
      ...campaignForm,
      goal: parseFloat(campaignForm.goal)
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'equity': return <Building className="w-4 h-4" />;
      case 'rewards': return <Heart className="w-4 h-4" />;
      case 'lending': return <DollarSign className="w-4 h-4" />;
      case 'impact': return <Target className="w-4 h-4" />;
      case 'angel': return <Users className="w-4 h-4" />;
      case 'vc': return <Briefcase className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'equity': return 'bg-blue-500';
      case 'rewards': return 'bg-green-500';
      case 'lending': return 'bg-yellow-500';
      case 'impact': return 'bg-purple-500';
      case 'angel': return 'bg-pink-500';
      case 'vc': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const defaultPlatforms: CrowdfundingPlatform[] = [
    {
      id: 'startengine',
      name: 'StartEngine',
      type: 'equity',
      description: 'Leading equity crowdfunding platform for U.S. startups under Reg CF/A+',
      maxRaise: '$50M (Reg A+), $1.07M (Reg CF)',
      website: 'https://startengine.com',
      fit: 'Excellent for C.A.R.E.N. community-driven equity raises',
      features: ['Non-accredited investors', 'Quick fund access', 'Control over offering']
    },
    {
      id: 'wefunder',
      name: 'Wefunder',
      type: 'equity',
      description: 'Community-driven equity crowdfunding under the JOBS Act',
      website: 'https://wefunder.com',
      fit: 'Perfect for C.A.R.E.N. mission-aligned community funding',
      features: ['JOBS Act compliance', 'Community focus', 'Early-stage startups']
    },
    {
      id: 'indiegogo',
      name: 'Indiegogo',
      type: 'rewards',
      description: 'Reward-based crowdfunding with global reach for hardware products',
      fees: '5% platform fee plus payment processing',
      website: 'https://indiegogo.com',
      fit: 'Ideal for pre-selling C.A.R.E.N. Units and building user interest',
      features: ['Hardware campaigns', 'Flexible funding', 'Global reach']
    },
    {
      id: 'swan-impact',
      name: 'SWAN Impact Network',
      type: 'impact',
      description: 'Impact investor network for startups with measurable societal benefits',
      website: 'https://swanimpactnetwork.com',
      fit: 'Excellent fit for C.A.R.E.N. public safety and justice mission',
      features: ['Societal impact', 'Measurable outcomes', 'Mission alignment']
    },
    {
      id: 'america-business-capital',
      name: 'America Business Capital',
      type: 'lending',
      description: 'Business lending and capital solutions for growing companies',
      website: 'https://americabusinesscapital.com',
      fit: 'Alternative funding for C.A.R.E.N. operations and equipment',
      features: ['Business loans', 'Equipment financing', 'SBA loans']
    }
  ];

  const carenFundingGoal = {
    total: 500000,
    breakdown: {
      'Hardware R&D': 200000,
      'App Development & AI': 150000,
      'Legal & Compliance': 50000,
      'Marketing & Outreach': 100000
    }
  };

  const displayPlatforms = platforms || defaultPlatforms;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">C.A.R.E.N. Crowdfunding Strategy</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive funding approach for roadside safety innovation
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Target: $500K Seed Round
        </Badge>
      </div>

      {/* Funding Goal Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            C.A.R.E.N. Funding Breakdown
          </CardTitle>
          <CardDescription>
            Strategic allocation of $500,000 seed funding for maximum impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(carenFundingGoal.breakdown).map(([category, amount]) => (
              <div key={category} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  ${(amount / 1000).toFixed(0)}K
                </div>
                <div className="text-sm text-muted-foreground">{category}</div>
                <Progress 
                  value={(amount / carenFundingGoal.total) * 100} 
                  className="mt-2 h-2" 
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="platforms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="platforms">Funding Platforms</TabsTrigger>
          <TabsTrigger value="campaigns">Active Campaigns</TabsTrigger>
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayPlatforms.map((platform: CrowdfundingPlatform) => (
              <Card key={platform.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className={`p-2 rounded-full ${getTypeColor(platform.type)} text-white`}>
                        {getTypeIcon(platform.type)}
                      </div>
                      {platform.name}
                    </CardTitle>
                    <Badge variant="outline">{platform.type}</Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {platform.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {platform.maxRaise && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Max: {platform.maxRaise}</span>
                    </div>
                  )}
                  
                  {platform.fees && (
                    <div className="text-sm text-muted-foreground">
                      Fees: {platform.fees}
                    </div>
                  )}

                  {platform.features && (
                    <div className="space-y-1">
                      {platform.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      C.A.R.E.N. Fit: {platform.fit}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(platform.website, '_blank')}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Platform
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => setSelectedPlatform(platform.id)}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {campaignsLoading ? (
            <div className="text-center py-8">Loading campaigns...</div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((campaign: Campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{campaign.title}</CardTitle>
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <CardDescription>Platform: {campaign.platform}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>${campaign.raised.toLocaleString()} / ${campaign.goal.toLocaleString()}</span>
                      </div>
                      <Progress value={(campaign.raised / campaign.goal) * 100} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{campaign.backers}</div>
                        <div className="text-sm text-muted-foreground">Backers</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {Math.round((campaign.raised / campaign.goal) * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Funded</div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                    
                    <Button className="w-full">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Manage Campaign
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground mb-4">No active campaigns yet</div>
                <Button onClick={() => setSelectedPlatform('')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Crowdfunding Campaign</CardTitle>
              <CardDescription>
                Launch a funding campaign for the C.A.R.E.N. project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select a platform</option>
                    {displayPlatforms.map((platform: CrowdfundingPlatform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name} ({platform.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Campaign Title</Label>
                  <Input
                    id="title"
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="C.A.R.E.N. - Roadside Safety Powered by AI"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Funding Goal ($)</Label>
                  <Input
                    id="goal"
                    type="number"
                    value={campaignForm.goal}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, goal: e.target.value }))}
                    placeholder="500000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Campaign Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={campaignForm.deadline}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Campaign Description</Label>
                  <Textarea
                    id="description"
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your C.A.R.E.N. crowdfunding campaign..."
                    rows={4}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createCampaignMutation.isPending}
                >
                  {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}