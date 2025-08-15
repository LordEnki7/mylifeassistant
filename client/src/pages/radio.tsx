import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { RadioStation } from "@shared/schema";

export default function Radio() {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    frequency: "",
    location: "",
    genre: "",
    contactEmail: "",
    contactName: "",
    website: "",
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: stations = [], isLoading } = useQuery<RadioStation[]>({
    queryKey: ["/api/radio-stations"],
  });

  const addStationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/radio-stations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/radio-stations"] });
      setIsAdding(false);
      setFormData({
        name: "",
        frequency: "",
        location: "",
        genre: "",
        contactEmail: "",
        contactName: "",
        website: "",
        notes: "",
      });
    },
  });

  const updateStationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RadioStation> }) => {
      const response = await apiRequest("PUT", `/api/radio-stations/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/radio-stations"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStationMutation.mutate(formData);
  };

  const handleStatusChange = (stationId: string, newStatus: string) => {
    updateStationMutation.mutate({
      id: stationId,
      data: { status: newStatus, lastContacted: newStatus === "contacted" ? new Date() : undefined },
    });
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    contacted: "bg-blue-100 text-blue-800",
    responded: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Radio Stations</h1>
          <p className="text-gray-600">Discover and manage radio station contacts for your music submissions.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center">
          <Icons.plus className="h-4 w-4 mr-2" />
          Add Station
        </Button>
      </div>

      {isAdding && (
        <Card className="material-card mb-8">
          <CardHeader>
            <CardTitle>Add Radio Station</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Station Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., KQED FM"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <Input
                    type="text"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    placeholder="e.g., 88.5 FM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <Input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genre/Format
                  </label>
                  <Input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder="e.g., Jazz, Classical, Folk"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <Input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Music Director name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="music@station.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://station.com"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addStationMutation.isPending}
                >
                  {addStationMutation.isPending ? "Adding..." : "Add Station"}
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
        ) : stations.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Icons.radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No radio stations yet</h3>
              <p className="text-gray-600 mb-4">
                Add radio stations to track your music submission efforts and build relationships.
              </p>
              <Button onClick={() => setIsAdding(true)}>
                <Icons.plus className="h-4 w-4 mr-2" />
                Add Station
              </Button>
            </CardContent>
          </Card>
        ) : (
          stations.map((station) => (
            <Card key={station.id} className="material-card hover:material-card-elevated transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{station.name}</CardTitle>
                  <Badge className={statusColors[station.status as keyof typeof statusColors]}>
                    {station.status}
                  </Badge>
                </div>
                {station.frequency && (
                  <p className="text-sm text-gray-600">{station.frequency}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {station.location && (
                    <p className="text-sm text-gray-600 flex items-center">
                      <Icons.building className="h-4 w-4 mr-1" />
                      {station.location}
                    </p>
                  )}
                  
                  {station.genre && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Genre:</span> {station.genre}
                    </p>
                  )}

                  {station.contactName && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Contact:</span> {station.contactName}
                    </p>
                  )}

                  {station.contactEmail && (
                    <p className="text-sm text-gray-600 flex items-center">
                      <Icons.email className="h-4 w-4 mr-1" />
                      {station.contactEmail}
                    </p>
                  )}

                  {station.lastContacted && (
                    <p className="text-xs text-gray-500">
                      Last contacted: {new Date(station.lastContacted).toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex space-x-2 pt-3">
                    <select
                      value={station.status || "pending"}
                      onChange={(e) => handleStatusChange(station.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="responded">Responded</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    
                    <Button size="sm" variant="outline">
                      <Icons.email className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
