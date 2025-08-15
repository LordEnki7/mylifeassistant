import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Grant } from "@shared/schema";
import carenLogo from "@assets/C.A.R.E.N_1755278709452.png";

export default function Grants() {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isSearchingWithSunshine, setIsSearchingWithSunshine] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    organization: "",
    amount: "",
    deadline: "",
    description: "",
    requirements: "",
    applicationUrl: "",
    notes: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: grants = [], isLoading } = useQuery<Grant[]>({
    queryKey: ["/api/grants"],
  });

  const addGrantMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/grants", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grants"] });
      setIsAdding(false);
      setFormData({
        title: "",
        organization: "",
        amount: "",
        deadline: "",
        description: "",
        requirements: "",
        applicationUrl: "",
        notes: "",
      });
    },
  });

  const updateGrantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Grant> }) => {
      const response = await apiRequest("PUT", `/api/grants/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grants"] });
    },
  });

  const searchGrantsWithSunshine = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/search-grants", {
        projectName: "C.A.R.E.N",
        description: "Roadside Rights Protection Platform - A visionary platform for real-time legal safety using AI technology",
        focus: "legal technology, roadside assistance, AI safety platforms, consumer protection, automotive safety, legal rights protection"
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Grant Search Complete!",
        description: `Sunshine found ${data.grants?.length || 0} potential funding opportunities for C.A.R.E.N.`,
      });
      // Refresh grants to show newly found ones
      queryClient.invalidateQueries({ queryKey: ["/api/grants"] });
    },
    onError: () => {
      toast({
        title: "Search Failed",
        description: "Sunshine encountered an issue while searching for grants. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSunshineSearch = () => {
    setIsSearchingWithSunshine(true);
    searchGrantsWithSunshine.mutate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addGrantMutation.mutate(formData);
  };

  const handleStatusChange = (grantId: string, newStatus: string) => {
    updateGrantMutation.mutate({
      id: grantId,
      data: { status: newStatus },
    });
  };

  const statusColors = {
    discovered: "bg-blue-100 text-blue-800",
    applied: "bg-yellow-100 text-yellow-800",
    awarded: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const filteredGrants = grants.filter(grant => {
    const matchesSearch = grant.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         grant.organization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || grant.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return "none";
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return "past";
    if (daysUntil <= 7) return "urgent";
    if (daysUntil <= 30) return "soon";
    return "future";
  };

  return (
    <div className="p-4 lg:p-8">
      {/* C.A.R.E.N Logo Header */}
      <div className="mb-8 text-center">
        <img 
          src={carenLogo} 
          alt="C.A.R.E.N - Roadside Rights Protection Platform" 
          className="mx-auto h-32 sm:h-40 md:h-48 w-auto mb-6"
        />
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Grant Opportunities for C.A.R.E.N</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track and discover funding opportunities for your Roadside Rights Protection Platform. 
            Let Sunshine search the web for grants that match your AI-powered legal safety vision.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button 
            onClick={handleSunshineSearch}
            disabled={searchGrantsWithSunshine.isPending}
            className="flex items-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            <Icons.search className="h-4 w-4 mr-2" />
            {searchGrantsWithSunshine.isPending ? "Sunshine Searching..." : "☀️ Find Grants with Sunshine"}
          </Button>
          <Button onClick={() => setIsAdding(true)} variant="outline" className="flex items-center">
            <Icons.plus className="h-4 w-4 mr-2" />
            Add Grant Manually
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="material-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search grants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="discovered">Discovered</option>
                <option value="applied">Applied</option>
                <option value="awarded">Awarded</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdding && (
        <Card className="material-card mb-8">
          <CardHeader>
            <CardTitle>Add Grant Opportunity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grant Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Community Arts Development Grant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization *
                  </label>
                  <Input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g., Arts Council"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grant Amount
                  </label>
                  <Input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g., $25,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application Deadline
                  </label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application URL
                  </label>
                  <Input
                    type="url"
                    value={formData.applicationUrl}
                    onChange={(e) => setFormData({ ...formData, applicationUrl: e.target.value })}
                    placeholder="https://grantor.org/apply"
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
                  placeholder="Grant purpose, focus areas, etc."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements
                </label>
                <Textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Eligibility criteria, required documents, etc."
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
                  placeholder="Personal notes, application strategy, etc."
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
                <Button 
                  type="submit" 
                  disabled={addGrantMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {addGrantMutation.isPending ? "Adding..." : "Add Grant"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))
        ) : filteredGrants.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Icons.building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterStatus !== "all" ? "No grants found" : "No grants tracked yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterStatus !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Start tracking grant opportunities for your C.A.R.E.N. project and other funding needs."
                }
              </p>
              {!searchQuery && filterStatus === "all" && (
                <Button onClick={() => setIsAdding(true)}>
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Add Grant
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredGrants.map((grant) => {
            const deadlineStatus = getDeadlineStatus(grant.deadline ? grant.deadline.toString() : null);
            return (
              <Card key={grant.id} className="material-card hover:material-card-elevated transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{grant.title}</CardTitle>
                      <p className="text-sm text-gray-600 truncate">{grant.organization}</p>
                    </div>
                    <Badge className={statusColors[grant.status as keyof typeof statusColors]}>
                      {grant.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {grant.amount && (
                      <div className="flex items-center">
                        <Icons.dollar className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm font-semibold text-green-600">
                          ${parseFloat(grant.amount).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {grant.deadline && (
                      <div className="flex items-center">
                        <Icons.calendar className="h-4 w-4 text-gray-500 mr-2" />
                        <span className={`text-sm ${
                          deadlineStatus === "urgent" ? "text-red-600 font-semibold" :
                          deadlineStatus === "soon" ? "text-yellow-600 font-medium" :
                          deadlineStatus === "past" ? "text-gray-400" : "text-gray-600"
                        }`}>
                          Due: {new Date(grant.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {grant.description && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Description:</p>
                        <p className="text-sm text-gray-900 line-clamp-3">{grant.description}</p>
                      </div>
                    )}

                    {grant.requirements && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Requirements:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{grant.requirements}</p>
                      </div>
                    )}

                    {grant.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{grant.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-3">
                      <select
                        value={grant.status || "discovered"}
                        onChange={(e) => handleStatusChange(grant.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={updateGrantMutation.isPending}
                      >
                        <option value="discovered">Discovered</option>
                        <option value="applied">Applied</option>
                        <option value="awarded">Awarded</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      
                      <div className="flex gap-2">
                        {grant.applicationUrl && (
                          <Button size="sm" variant="outline" className="flex-1" asChild>
                            <a href={grant.applicationUrl} target="_blank" rel="noopener noreferrer">
                              <Icons.building className="h-3 w-3 mr-1" />
                              Apply
                            </a>
                          </Button>
                        )}
                        <Button size="sm" className="flex-1">
                          <Icons.email className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
