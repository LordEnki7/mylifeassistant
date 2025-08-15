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
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/lib/icons";
import type { Song } from "@shared/schema";

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
  const [activeTab, setActiveTab] = useState("opportunities");
  const [isSearchingLicensing, setIsSearchingLicensing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch songs and opportunities from API
  const { data: songs = [], isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs'],
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="music-promotion">🎵 Music Promotion</TabsTrigger>
          <TabsTrigger value="opportunities">🎬 Sync Opportunities</TabsTrigger>
        </TabsList>

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
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Icons.music className="h-5 w-5 text-blue-600" />
                          {song.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{song.artist}</p>
                        {song.album && (
                          <p className="text-xs text-gray-500">Album: {song.album}</p>
                        )}
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
                            className="flex-1 text-sm"
                            size="sm"
                          >
                            {isSearchingLicensing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                Searching...
                              </>
                            ) : (
                              <>
                                ☀️ Find Opportunities
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
