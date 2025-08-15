import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { EmailCampaign } from "@shared/schema";

export default function Outreach() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    template: "",
    recipientType: "radio",
  });

  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/email-campaigns"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/email-campaigns", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      setIsCreating(false);
      setFormData({ name: "", subject: "", template: "", recipientType: "radio" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaignMutation.mutate(formData);
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    sending: "bg-blue-100 text-blue-800",
    sent: "bg-green-100 text-green-800",
    completed: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Email Outreach</h1>
          <p className="text-gray-600">Manage your email campaigns and outreach efforts.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center">
          <Icons.plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {isCreating && (
        <Card className="material-card mb-8">
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Radio Station Outreach Q1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Type
                  </label>
                  <select
                    value={formData.recipientType}
                    onChange={(e) => setFormData({ ...formData, recipientType: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="radio">Radio Stations</option>
                    <option value="licensing">Licensing Companies</option>
                    <option value="custom">Custom List</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject
                </label>
                <Input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Music Submission: [Your Artist Name]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Template
                </label>
                <Textarea
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  placeholder="Dear [Contact Name],&#10;&#10;I hope this email finds you well. I'm reaching out to submit my latest music for consideration..."
                  className="min-h-[200px]"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCampaignMutation.isPending}
                >
                  {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))
        ) : campaigns.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Icons.email className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first email campaign to start reaching out to radio stations and industry contacts.
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Icons.plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="material-card hover:material-card-elevated transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <Badge className={statusColors[campaign.status as keyof typeof statusColors]}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Subject:</p>
                    <p className="text-sm text-gray-900">{campaign.subject}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700">Type:</p>
                    <p className="text-sm text-gray-900 capitalize">{campaign.recipientType}</p>
                  </div>

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Sent: {campaign.sentCount}</span>
                    <span>Total: {campaign.totalRecipients}</span>
                  </div>

                  <div className="flex space-x-2 pt-3">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Icons.email className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {campaign.status === "draft" && (
                      <Button size="sm" className="flex-1">
                        <Icons.send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    )}
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
