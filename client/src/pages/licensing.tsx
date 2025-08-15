import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/lib/icons";
import type { Song, ActionItem, MusicSupervisor, SyncCampaign, PlatformSubmission } from "@shared/schema";

interface LicensingOpportunity {
  id: string;
  title: string;
  company: string;
  type: string; // film, tv, commercial, game, etc.
  genre: string;
  budget: string;
  deadline: string;
  status: string;
  description: string;
  contactEmail: string;
  notes: string;
}

interface MusicPromotionCampaign {
  id: string;
  songId: string;
  songTitle: string;
  artist: string;
  targetMarkets: string[];
  status: string;
  opportunities: any[];
  createdAt: string;
}

export default function Licensing() {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("action-items");
  const [isSearchingLicensing, setIsSearchingLicensing] = useState(false);
  const [showAddSupervisor, setShowAddSupervisor] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all data from API
  const { data: songs = [], isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs'],
  });

  const { data: actionItems = [], isLoading: actionItemsLoading } = useQuery<ActionItem[]>({
    queryKey: ['/api/action-items'],
  });

  const { data: musicSupervisors = [], isLoading: supervisorsLoading } = useQuery<MusicSupervisor[]>({
    queryKey: ['/api/music-supervisors'],
  });

  const { data: syncCampaigns = [], isLoading: campaignsLoading } = useQuery<SyncCampaign[]>({
    queryKey: ['/api/sync-campaigns'],
  });

  const { data: platformSubmissions = [], isLoading: submissionsLoading } = useQuery<PlatformSubmission[]>({
    queryKey: ['/api/platform-submissions'],
  });

  const { data: opportunities = [], isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['/api/licensing-opportunities'],
    queryFn: () => {
      // For now, return mock data as the opportunities endpoint doesn't exist yet
      return Promise.resolve(mockOpportunities);
    },
  });

  // Mock data for licensing opportunities - will be replaced by real API data
  const mockOpportunities: LicensingOpportunity[] = [
    {
      id: "1",
      title: "Indie Drama Film Score",
      company: "Sunset Pictures",
      type: "film",
      genre: "Acoustic/Folk",
      budget: "$5,000-$15,000",
      deadline: "2024-04-15",
      status: "active",
      description: "Looking for original acoustic tracks for coming-of-age indie drama. Need 3-4 songs with emotional depth.",
      contactEmail: "music@sunsetpictures.com",
      notes: "Responded to initial inquiry"
    },
    {
      id: "2", 
      title: "Commercial Campaign",
      company: "BrandCorp Marketing",
      type: "commercial",
      genre: "Upbeat Pop",
      budget: "$8,000-$12,000", 
      deadline: "2024-03-30",
      status: "pending",
      description: "30-second commercial for lifestyle brand. Need energetic, modern pop track.",
      contactEmail: "creative@brandcorp.com",
      notes: "Submitted 2 tracks for review"
    }
  ];

  const [formData, setFormData] = useState({
    title: "",
    company: "",
    type: "film",
    genre: "",
    budget: "",
    deadline: "",
    description: "",
    contactEmail: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would call the API to create a new opportunity
    console.log("Creating licensing opportunity:", formData);
    setIsAdding(false);
    setFormData({
      title: "",
      company: "",
      type: "film",
      genre: "",
      budget: "",
      deadline: "",
      description: "",
      contactEmail: "",
      notes: "",
    });
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    won: "bg-purple-100 text-purple-800",
    lost: "bg-red-100 text-red-800",
  };

  const typeColors = {
    film: "bg-purple-100 text-purple-800",
    tv: "bg-blue-100 text-blue-800", 
    commercial: "bg-green-100 text-green-800",
    game: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800",
  };

  const supervisorContactStatusColors = {
    'not_contacted': 'bg-gray-100 text-gray-800',
    'contacted': 'bg-blue-100 text-blue-800',
    'responded': 'bg-green-100 text-green-800',
    'relationship': 'bg-purple-100 text-purple-800'
  };

  const campaignStatusColors = {
    'planning': 'bg-gray-100 text-gray-800',
    'active': 'bg-blue-100 text-blue-800',
    'paused': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800'
  };

  // AI-powered licensing search mutation
  const licensingSearchMutation = useMutation({
    mutationFn: async ({ songTitle, artist, genre, description }: { songTitle: string; artist: string; genre: string; description: string }) => {
      const response = await apiRequest('POST', '/api/ai/search-licensing', {
        songTitle,
        artist,
        genre,
        description,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Licensing Opportunities Found!",
        description: data.message,
      });
      // Refresh opportunities data
      queryClient.invalidateQueries({ queryKey: ['/api/licensing-opportunities'] });
    },
    onError: () => {
      toast({
        title: "Search Failed",
        description: "Unable to search for licensing opportunities. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLicensingSearch = async (song: Song) => {
    setIsSearchingLicensing(true);
    try {
      await licensingSearchMutation.mutateAsync({
        songTitle: song.title,
        artist: song.artist,
        genre: song.genre || "Alternative Rock",
        description: song.description || `${song.genre || "Alternative Rock"} song with commercial sync licensing potential`,
      });
    } finally {
      setIsSearchingLicensing(false);
    }
  };

  const filteredOpportunities = opportunities.filter((opp: LicensingOpportunity) => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opp.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || opp.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const isLoading = songsLoading || opportunitiesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading sync licensing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Sync Licensing & Music Promotion</h1>
          <p className="text-gray-600">Promote your music and discover licensing opportunities for films, TV, commercials, and games.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center w-full sm:w-auto">
          <Icons.plus className="h-4 w-4 mr-2" />
          Add Opportunity
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="action-items">⚡ Action Items</TabsTrigger>
          <TabsTrigger value="music-promotion">🎵 Music Promotion</TabsTrigger>
          <TabsTrigger value="supervisors">👥 Supervisors</TabsTrigger>
          <TabsTrigger value="campaigns">📈 Campaigns</TabsTrigger>
          <TabsTrigger value="opportunities">🎬 Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="action-items" className="space-y-6">
          <Card className="material-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.checkCircle className="h-5 w-5 text-blue-600" />
                Immediate Action Items - Shakim & Project DNA Sync Strategy
              </CardTitle>
              <p className="text-gray-600">Essential steps to optimize "Countyline Rd" for sync licensing success</p>
            </CardHeader>
            <CardContent>
              {actionItems.length === 0 ? (
                <div className="text-center py-8">
                  <Icons.clipboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No action items yet</h3>
                  <p className="text-gray-600">Your sync licensing action items will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {actionItems.map((item) => {
                    const priorityColors = {
                      low: 'bg-gray-100 text-gray-800',
                      medium: 'bg-blue-100 text-blue-800', 
                      high: 'bg-orange-100 text-orange-800',
                      critical: 'bg-red-100 text-red-800'
                    };
                    
                    const statusColors = {
                      pending: 'bg-yellow-100 text-yellow-800',
                      in_progress: 'bg-blue-100 text-blue-800',
                      completed: 'bg-green-100 text-green-800',
                      blocked: 'bg-red-100 text-red-800'
                    };
                    
                    return (
                      <Card key={item.id} className={`hover:shadow-lg transition-shadow ${
                        item.status === 'completed' ? 'opacity-75' : ''
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className={`font-medium ${
                                  item.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                                }`}>
                                  {item.title}
                                </h3>
                                <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
                                  {item.priority}
                                </Badge>
                                <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                                  {item.status?.replace('_', ' ')}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-3">
                                {item.description}
                              </p>
                              
                              {item.dueDate && (
                                <p className="text-xs text-gray-500 mb-2">
                                  Due: {new Date(item.dueDate).toLocaleDateString()}
                                </p>
                              )}
                              
                              {item.notes && (
                                <p className="text-xs text-blue-600 italic">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              {item.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Update action item status
                                    const nextStatus = item.status === 'pending' ? 'in_progress' : 'completed';
                                    fetch(`/api/action-items/${item.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: nextStatus })
                                    }).then(() => {
                                      queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
                                      toast({
                                        title: "Action item updated!",
                                        description: `Marked as ${nextStatus.replace('_', ' ')}`
                                      });
                                    });
                                  }}
                                >
                                  {item.status === 'pending' ? 'Start' : 'Complete'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supervisors" className="space-y-6">
          <Card className="material-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Icons.users className="h-5 w-5 text-blue-600" />
                    Music Supervisor Contacts
                  </CardTitle>
                  <p className="text-gray-600">Build relationships with music supervisors for sync opportunities</p>
                </div>
                <Button onClick={() => setShowAddSupervisor(true)} className="flex items-center">
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Add Supervisor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {musicSupervisors.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No music supervisors yet</h3>
                  <p className="text-gray-600 mb-4">Start building your network of music supervisor contacts</p>
                  <Button onClick={() => setShowAddSupervisor(true)}>
                    <Icons.plus className="h-4 w-4 mr-2" />
                    Add Your First Supervisor
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {musicSupervisors.map((supervisor) => (
                    <Card key={supervisor.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{supervisor.name}</h3>
                            {supervisor.company && (
                              <p className="text-sm text-gray-600">{supervisor.company}</p>
                            )}
                            {supervisor.position && (
                              <p className="text-xs text-gray-500">{supervisor.position}</p>
                            )}
                          </div>
                          <Badge className={supervisorContactStatusColors[supervisor.contactStatus as keyof typeof supervisorContactStatusColors] || 'bg-gray-100 text-gray-800'}>
                            {supervisor.contactStatus?.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        {supervisor.genres && supervisor.genres.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Genres:</p>
                            <div className="flex flex-wrap gap-1">
                              {supervisor.genres.map((genre, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {genre}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {supervisor.email && (
                          <p className="text-xs text-blue-600 mb-2">{supervisor.email}</p>
                        )}
                        
                        {supervisor.responseRate > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-700 mb-1">Response Rate: {supervisor.responseRate}%</p>
                            <Progress value={supervisor.responseRate} className="h-2" />
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Icons.mail className="h-3 w-3 mr-1" />
                            Contact
                          </Button>
                          <Button size="sm" variant="outline">
                            <Icons.eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card className="material-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Icons.barChart className="h-5 w-5 text-blue-600" />
                    Sync Licensing Campaigns
                  </CardTitle>
                  <p className="text-gray-600">Track your music promotion campaigns and their performance</p>
                </div>
                <Button onClick={() => setShowAddCampaign(true)} className="flex items-center">
                  <Icons.plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {syncCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.barChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-600 mb-4">Create your first sync licensing campaign for "Countyline Rd"</p>
                  <Button onClick={() => setShowAddCampaign(true)}>
                    <Icons.plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {syncCampaigns.map((campaign) => {
                    const song = songs.find(s => s.id === campaign.songId);
                    return (
                      <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                              <p className="text-sm text-gray-600">
                                {song?.title} by {song?.artist}
                              </p>
                              <Badge className="mt-2">{campaign.targetType}</Badge>
                            </div>
                            <Badge className={campaignStatusColors[campaign.status as keyof typeof campaignStatusColors] || 'bg-gray-100 text-gray-800'}>
                              {campaign.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {campaign.supervisorsTargeted || 0}
                              </div>
                              <div className="text-xs text-gray-500">Supervisors Targeted</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {campaign.responsesReceived || 0}
                              </div>
                              <div className="text-xs text-gray-500">Responses</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {campaign.placementsAchieved || 0}
                              </div>
                              <div className="text-xs text-gray-500">Placements</div>
                            </div>
                          </div>
                          
                          {campaign.totalRevenue && Number(campaign.totalRevenue) > 0 && (
                            <div className="text-center py-2 px-4 bg-green-50 rounded-lg mb-4">
                              <div className="text-lg font-bold text-green-700">
                                ${Number(campaign.totalRevenue).toLocaleString()}
                              </div>
                              <div className="text-xs text-green-600">Total Revenue</div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <Icons.eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button size="sm" variant="outline">
                              <Icons.edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="music-promotion" className="space-y-6">
          <Card className="material-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.music className="h-5 w-5 text-blue-600" />
                Music Promotion Campaigns
              </CardTitle>
              <p className="text-gray-600">Manage your music promotion and discover sync licensing opportunities with Sunshine AI</p>
            </CardHeader>
            <CardContent>
              {songs.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No songs available</h3>
                  <p className="text-gray-600 mb-4">Your music catalog will appear here for sync licensing promotion.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {(songs as Song[]).map((song: Song) => (
                    <Card key={song.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-3">
                          {song.artist === "Shakim & Project DNA" && (
                            <img 
                              src="/attached_assets/image_1755280969223.jpeg" 
                              alt="Shakim & Project DNA Logo" 
                              className="h-12 w-12 rounded-lg object-cover border-2 border-blue-200" 
                            />
                          )}
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Icons.music className="h-5 w-5 text-blue-600" />
                              {song.title}
                            </CardTitle>
                            <p className="text-sm text-gray-600 font-medium">{song.artist}</p>
                            {song.album && (
                              <p className="text-xs text-gray-500">Album: {song.album}</p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {song.genre && (
                            <Badge variant="outline">{song.genre}</Badge>
                          )}
                          <Badge 
                            variant={song.promotionStatus === "active" ? "default" : "secondary"}
                          >
                            {song.promotionStatus}
                          </Badge>
                        </div>
                        
                        {song.description && (
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {song.description}
                          </p>
                        )}
                        
                        {song.targetLicenseTypes && song.targetLicenseTypes.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-2">Target Markets:</p>
                            <div className="flex flex-wrap gap-1">
                              {song.targetLicenseTypes.map((type, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleLicensingSearch(song)}
                            disabled={isSearchingLicensing || licensingSearchMutation.isPending}
                            className="flex-1 text-sm bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                            size="sm"
                          >
                            {isSearchingLicensing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                Sunshine Searching...
                              </>
                            ) : (
                              <>
                                ☀️ Find Opportunities with Sunshine
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Icons.eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">

          {/* Search and Filter */}
      <Card className="material-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="film">Film</option>
                <option value="tv">TV</option>
                <option value="commercial">Commercial</option>
                <option value="game">Video Game</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

          {isAdding && (
        <Card className="material-card mb-8">
          <CardHeader>
            <CardTitle>Add Licensing Opportunity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Indie Drama Film Score"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company/Client *
                  </label>
                  <Input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g., Sunset Pictures"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="film">Film</option>
                    <option value="tv">TV</option>
                    <option value="commercial">Commercial</option>
                    <option value="game">Video Game</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genre/Style
                  </label>
                  <Input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder="e.g., Acoustic Folk, Electronic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Range
                  </label>
                  <Input
                    type="text"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g., $5,000-$15,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="music@company.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project details, music requirements, etc."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Personal notes, follow-up reminders, etc."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Add Opportunity
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOpportunities.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Icons.movie className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterType !== "all" ? "No opportunities found" : "No licensing opportunities yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterType !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "Track sync licensing opportunities for films, TV shows, commercials, and games."
                }
              </p>
              {!searchQuery && filterType === "all" && (
                <Button onClick={() => setIsAdding(true)}>
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Add Opportunity
                </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredOpportunities.map((opportunity) => (
              <Card key={opportunity.id} className="material-card hover:material-card-elevated transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{opportunity.title}</CardTitle>
                      <p className="text-sm text-gray-600 truncate">{opportunity.company}</p>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      <Badge className={statusColors[opportunity.status as keyof typeof statusColors]}>
                        {opportunity.status}
                      </Badge>
                      <Badge className={typeColors[opportunity.type as keyof typeof typeColors]}>
                        {opportunity.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {opportunity.genre && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Genre:</p>
                        <p className="text-sm text-gray-900">{opportunity.genre}</p>
                      </div>
                    )}
                    
                    {opportunity.budget && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Budget:</p>
                        <p className="text-sm text-gray-900">{opportunity.budget}</p>
                      </div>
                    )}

                    {opportunity.deadline && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Deadline:</p>
                        <p className="text-sm text-gray-900">
                          {new Date(opportunity.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Description:</p>
                      <p className="text-sm text-gray-900 line-clamp-3">{opportunity.description}</p>
                    </div>

                    {opportunity.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{opportunity.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-3">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Icons.movie className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1">
                        <Icons.email className="h-4 w-4 mr-1" />
                        Contact
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
