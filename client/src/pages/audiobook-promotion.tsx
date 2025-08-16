import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { 
  Audiobook, 
  AudiobookPromotionalCampaign, 
  AudiobookPromotionalActivity, 
  AudiobookPromotionalContent 
} from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const platformCategories = {
  "Book-Centric Micro-Platforms": {
    platforms: [
      { name: "BookTok/TikTok", description: "Viral recommendation machine for YA, romance, fantasy audiences", icon: "video", color: "bg-red-100 text-red-800" },
      { name: "Bookstagram", description: "Curated visuals + book aesthetics drive big engagement", icon: "camera", color: "bg-pink-100 text-pink-800" },
      { name: "Litsy", description: "The 'Instagram for books' - post quick blurbs and quotes", icon: "bookmark", color: "bg-blue-100 text-blue-800" }
    ]
  },
  "Community & Fan Engagement": {
    platforms: [
      { name: "Discord", description: "Set up reader communities for lore discussions and fan art", icon: "users", color: "bg-purple-100 text-purple-800" },
      { name: "Reddit", description: "Create chapters and communities for deep discussions", icon: "messageCircle", color: "bg-orange-100 text-orange-800" },
      { name: "Fan Kits", description: "Physical/digital merch, pins, keychains, postcards", icon: "gift", color: "bg-green-100 text-green-800" }
    ]
  },
  "Reader-First Platforms": {
    platforms: [
      { name: "Allstora Marketplace", description: "Fair-pay, inclusive space with community-building", icon: "store", color: "bg-teal-100 text-teal-800" },
      { name: "Wattpad", description: "Tease chapters, write side stories, reach Gen Z", icon: "fileText", color: "bg-yellow-100 text-yellow-800" },
      { name: "Medium", description: "Serialize content and build author platform", icon: "edit", color: "bg-gray-100 text-gray-800" }
    ]
  },
  "Strategic Email & Launch Tools": {
    platforms: [
      { name: "StoryOrigin", description: "Distribute reader magnets and build email list", icon: "mail", color: "bg-indigo-100 text-indigo-800" },
      { name: "Substack", description: "Serialized newsletter with lore insights and subscriptions", icon: "newsletter", color: "bg-emerald-100 text-emerald-800" }
    ]
  },
  "Review & Discovery Networks": {
    platforms: [
      { name: "NetGalley", description: "Advanced e-galleys to librarians and media outlets", icon: "book", color: "bg-blue-100 text-blue-800" },
      { name: "Goodreads", description: "Reader groups, challenges, and peer recommendations", icon: "star", color: "bg-yellow-100 text-yellow-800" }
    ]
  },
  "Creative Collaborations & Events": {
    platforms: [
      { name: "Indie Book Clubs", description: "Partner with romance-focused indie bookstores", icon: "home", color: "bg-rose-100 text-rose-800" },
      { name: "Live Digital Events", description: "Themed watch parties, soundtrack livestreams, cosplay", icon: "video", color: "bg-violet-100 text-violet-800" }
    ]
  },
  "DIY Marketing Tools": {
    platforms: [
      { name: "BookBrush", description: "Design promo images, mock covers, social graphics", icon: "image", color: "bg-cyan-100 text-cyan-800" },
      { name: "Creative Guides", description: "Themed bookmarks, playlists, interactive maps", icon: "map", color: "bg-lime-100 text-lime-800" }
    ]
  }
};

const campaignTypes = [
  { value: "launch", label: "Book Launch", description: "Full-scale launch campaign" },
  { value: "awareness", label: "Brand Awareness", description: "Build author and book recognition" },
  { value: "sales_boost", label: "Sales Boost", description: "Drive immediate sales" },
  { value: "series_promotion", label: "Series Promotion", description: "Promote entire series" },
  { value: "seasonal", label: "Seasonal Campaign", description: "Holiday or seasonal promotion" },
  { value: "collaboration", label: "Collaboration", description: "Partner with other authors/brands" }
];

const activityTypes = [
  { value: "social_post", label: "Social Media Post", platforms: ["BookTok/TikTok", "Bookstagram", "Litsy"] },
  { value: "email_blast", label: "Email Campaign", platforms: ["StoryOrigin", "Substack"] },
  { value: "podcast_guest", label: "Podcast Appearance", platforms: ["Live Digital Events"] },
  { value: "blog_post", label: "Blog Post", platforms: ["Medium", "Substack"] },
  { value: "press_release", label: "Press Release", platforms: ["NetGalley"] },
  { value: "influencer_outreach", label: "Influencer Outreach", platforms: ["BookTok/TikTok", "Bookstagram"] },
  { value: "community_event", label: "Community Event", platforms: ["Discord", "Reddit"] },
  { value: "fan_kit_launch", label: "Fan Kit Launch", platforms: ["Fan Kits"] },
  { value: "review_campaign", label: "Review Campaign", platforms: ["NetGalley", "Goodreads"] }
];

export default function AudiobookPromotionPage() {
  const queryClient = useQueryClient();
  const [selectedAudiobook, setSelectedAudiobook] = useState<Audiobook | null>(null);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AudiobookPromotionalCampaign | null>(null);
  
  const [campaignData, setCampaignData] = useState({
    name: "",
    objective: "",
    targetAudience: "",
    budget: "",
    description: "",
    startDate: "",
    endDate: "",
    channels: [] as string[]
  });

  const [activityData, setActivityData] = useState({
    title: "",
    type: "",
    channel: "",
    description: "",
    content: "",
    scheduledDate: "",
    budget: ""
  });

  const { data: audiobooks = [], isLoading: audiobooksLoading } = useQuery<Audiobook[]>({
    queryKey: ["/api/audiobooks"],
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<AudiobookPromotionalCampaign[]>({
    queryKey: ["/api/audiobook-promotional-campaigns"],
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<AudiobookPromotionalActivity[]>({
    queryKey: ["/api/audiobook-promotional-activities", selectedCampaign?.id],
    enabled: !!selectedCampaign?.id,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (newCampaign: any) => {
      const response = await apiRequest("POST", "/api/audiobook-promotional-campaigns", newCampaign);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audiobook-promotional-campaigns"] });
      setShowCampaignDialog(false);
      resetCampaignForm();
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (newActivity: any) => {
      const response = await apiRequest("POST", "/api/audiobook-promotional-activities", newActivity);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audiobook-promotional-activities", selectedCampaign?.id] });
      setShowActivityDialog(false);
      resetActivityForm();
    },
  });

  const resetCampaignForm = () => {
    setCampaignData({
      name: "",
      objective: "",
      targetAudience: "",
      budget: "",
      description: "",
      startDate: "",
      endDate: "",
      channels: []
    });
  };

  const resetActivityForm = () => {
    setActivityData({
      title: "",
      type: "",
      channel: "",
      description: "",
      content: "",
      scheduledDate: "",
      budget: ""
    });
  };

  const handleCreateCampaign = () => {
    if (!selectedAudiobook) return;
    
    const campaignToCreate = {
      ...campaignData,
      audiobookId: selectedAudiobook.id,
      budget: campaignData.budget || null,
      startDate: campaignData.startDate || null,
      endDate: campaignData.endDate || null,
      channels: campaignData.channels.length > 0 ? campaignData.channels : null
    };
    createCampaignMutation.mutate(campaignToCreate);
  };

  const handleCreateActivity = () => {
    if (!selectedCampaign) return;
    
    const activityToCreate = {
      ...activityData,
      campaignId: selectedCampaign.id,
      budget: activityData.budget || null,
      scheduledDate: activityData.scheduledDate || null
    };
    createActivityMutation.mutate(activityToCreate);
  };

  const toggleChannel = (channelName: string) => {
    setCampaignData(prev => ({
      ...prev,
      channels: prev.channels.includes(channelName)
        ? prev.channels.filter(c => c !== channelName)
        : [...prev.channels, channelName]
    }));
  };

  if (audiobooksLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audiobook Promotion Hub</h1>
          <p className="text-gray-600 mt-2">
            Modern marketing strategies and nontraditional platforms to promote your audiobooks
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCampaignDialog(true)}
            disabled={!selectedAudiobook}
          >
            <Icons.plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowActivityDialog(true)}
            disabled={!selectedCampaign}
          >
            <Icons.calendar className="w-4 h-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      <Tabs defaultValue="platforms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="platforms">Marketing Platforms</TabsTrigger>
          <TabsTrigger value="campaigns">Active Campaigns</TabsTrigger>
          <TabsTrigger value="activities">Campaign Activities</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-6">
          {/* Audiobook Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Audiobook to Promote</CardTitle>
              <CardDescription>Choose which audiobook you want to create promotional campaigns for</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {audiobooks.map((book) => (
                  <Card 
                    key={book.id} 
                    className={`cursor-pointer transition-all ${
                      selectedAudiobook?.id === book.id 
                        ? "ring-2 ring-primary-500 bg-primary-50" 
                        : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedAudiobook(book)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{book.title}</h3>
                      <p className="text-sm text-gray-600">by {book.author}</p>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline">{book.genre}</Badge>
                        {book.targetAudience && (
                          <Badge variant="secondary">{book.targetAudience}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Marketing Platform Categories */}
          <div className="space-y-6">
            {Object.entries(platformCategories).map(([category, { platforms }]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-xl">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {platforms.map((platform) => (
                      <Card key={platform.name} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className={`p-2 rounded-lg ${platform.color}`}>
                                {platform.icon === "video" && <Icons.movie className="w-5 h-5" />}
                                {platform.icon === "camera" && <Icons.eye className="w-5 h-5" />}
                                {platform.icon === "bookmark" && <Icons.book className="w-5 h-5" />}
                                {platform.icon === "users" && <Icons.users className="w-5 h-5" />}
                                {platform.icon === "messageCircle" && <Icons.chat className="w-5 h-5" />}
                                {platform.icon === "gift" && <Icons.plus className="w-5 h-5" />}
                                {platform.icon === "store" && <Icons.building className="w-5 h-5" />}
                                {platform.icon === "fileText" && <Icons.fileText className="w-5 h-5" />}
                                {platform.icon === "edit" && <Icons.edit className="w-5 h-5" />}
                                {platform.icon === "mail" && <Icons.mail className="w-5 h-5" />}
                                {platform.icon === "newsletter" && <Icons.mail className="w-5 h-5" />}
                                {platform.icon === "book" && <Icons.book className="w-5 h-5" />}
                                {platform.icon === "star" && <Icons.trending className="w-5 h-5" />}
                                {platform.icon === "home" && <Icons.building className="w-5 h-5" />}
                                {platform.icon === "image" && <Icons.eye className="w-5 h-5" />}
                                {platform.icon === "map" && <Icons.search className="w-5 h-5" />}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1">{platform.name}</h4>
                              <p className="text-xs text-gray-600 mb-3">{platform.description}</p>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    if (selectedAudiobook) {
                                      setCampaignData(prev => ({
                                        ...prev,
                                        channels: [...prev.channels, platform.name]
                                      }));
                                      setShowCampaignDialog(true);
                                    }
                                  }}
                                  disabled={!selectedAudiobook}
                                >
                                  <Icons.plus className="w-3 h-3 mr-1" />
                                  Use
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const audiobook = audiobooks.find(b => b.id === campaign.audiobookId);
              return (
                <Card 
                  key={campaign.id} 
                  className={`cursor-pointer transition-all ${
                    selectedCampaign?.id === campaign.id 
                      ? "ring-2 ring-primary-500" 
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <CardDescription>{audiobook?.title}</CardDescription>
                      </div>
                      <Badge 
                        className={
                          campaign.status === "active" ? "bg-green-100 text-green-800" :
                          campaign.status === "planning" ? "bg-blue-100 text-blue-800" :
                          campaign.status === "completed" ? "bg-gray-100 text-gray-800" :
                          "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Objective</p>
                        <p className="text-sm">{campaign.objective}</p>
                      </div>
                      
                      {campaign.budget && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Budget</p>
                          <p className="text-sm">${campaign.budget}</p>
                        </div>
                      )}
                      
                      {campaign.channels && campaign.channels.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">Channels</p>
                          <div className="flex flex-wrap gap-1">
                            {campaign.channels.map((channel) => (
                              <Badge key={channel} variant="outline" className="text-xs">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          {selectedCampaign ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activities for "{selectedCampaign.name}"</CardTitle>
                  <CardDescription>
                    Manage promotional activities for this campaign
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activities.map((activity) => (
                  <Card key={activity.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{activity.title}</CardTitle>
                          <CardDescription>{activity.channel}</CardDescription>
                        </div>
                        <Badge 
                          className={
                            activity.status === "completed" ? "bg-green-100 text-green-800" :
                            activity.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                            activity.status === "planned" ? "bg-gray-100 text-gray-800" :
                            "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Type</p>
                          <p className="text-sm">{activity.type}</p>
                        </div>
                        
                        {activity.scheduledDate && (
                          <div>
                            <p className="text-sm font-medium text-gray-600">Scheduled</p>
                            <p className="text-sm">{new Date(activity.scheduledDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        
                        {activity.budget && (
                          <div>
                            <p className="text-sm font-medium text-gray-600">Budget</p>
                            <p className="text-sm">${activity.budget}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-600">Select a campaign to view its activities</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Icons.trending className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {campaigns.filter(c => c.status === "active").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Icons.calendar className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Activities</p>
                    <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Icons.dollar className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${campaigns.reduce((sum, c) => sum + (parseFloat(c.budget || "0")), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Icons.users className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Platform Reach</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Set(campaigns.flatMap(c => c.channels || [])).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Promotional Campaign</DialogTitle>
            <DialogDescription>
              {selectedAudiobook ? `Creating campaign for "${selectedAudiobook.title}"` : "Select an audiobook first"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name *</Label>
                <Input
                  id="campaign-name"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Summer Launch Campaign"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="objective">Objective *</Label>
                <Select 
                  value={campaignData.objective} 
                  onValueChange={(value) => setCampaignData(prev => ({ ...prev, objective: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign objective" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target-audience">Target Audience</Label>
                <Input
                  id="target-audience"
                  value={campaignData.targetAudience}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="YA readers, romance fans"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={campaignData.budget}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="1000.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={campaignData.startDate}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={campaignData.endDate}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Marketing Channels</Label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-4">
                {Object.entries(platformCategories).map(([category, { platforms }]) => (
                  <div key={category} className="col-span-3">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">{category}</h4>
                    <div className="grid grid-cols-1 gap-1 mb-4">
                      {platforms.map((platform) => (
                        <div key={platform.name} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`channel-${platform.name}`}
                            checked={campaignData.channels.includes(platform.name)}
                            onChange={() => toggleChannel(platform.name)}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`channel-${platform.name}`} className="text-sm">
                            {platform.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Campaign Description</Label>
              <Textarea
                id="description"
                value={campaignData.description}
                onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your campaign strategy and goals..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCampaign}
                disabled={!campaignData.name || !campaignData.objective || !selectedAudiobook || createCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Campaign Activity</DialogTitle>
            <DialogDescription>
              {selectedCampaign ? `Adding activity to "${selectedCampaign.name}"` : "Select a campaign first"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity-title">Activity Title *</Label>
                <Input
                  id="activity-title"
                  value={activityData.title}
                  onChange={(e) => setActivityData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="BookTok Video Series"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-type">Activity Type *</Label>
                <Select 
                  value={activityData.type} 
                  onValueChange={(value) => {
                    const selectedType = activityTypes.find(t => t.value === value);
                    setActivityData(prev => ({ 
                      ...prev, 
                      type: value,
                      channel: selectedType?.platforms[0] || ""
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                <Select 
                  value={activityData.channel} 
                  onValueChange={(value) => setActivityData(prev => ({ ...prev, channel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.find(t => t.value === activityData.type)?.platforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    )) || Object.values(platformCategories).flatMap(cat => cat.platforms).map((platform) => (
                      <SelectItem key={platform.name} value={platform.name}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-budget">Budget ($)</Label>
                <Input
                  id="activity-budget"
                  type="number"
                  step="0.01"
                  value={activityData.budget}
                  onChange={(e) => setActivityData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="100.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-date">Scheduled Date</Label>
              <Input
                id="scheduled-date"
                type="datetime-local"
                value={activityData.scheduledDate}
                onChange={(e) => setActivityData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                value={activityData.description}
                onChange={(e) => setActivityData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this promotional activity..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content/Copy</Label>
              <Textarea
                id="content"
                value={activityData.content}
                onChange={(e) => setActivityData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write the actual content for this activity..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowActivityDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateActivity}
                disabled={!activityData.title || !activityData.type || !activityData.channel || !selectedCampaign || createActivityMutation.isPending}
              >
                {createActivityMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  'Add Activity'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}