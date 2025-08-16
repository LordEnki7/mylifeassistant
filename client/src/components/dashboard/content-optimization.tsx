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

interface ContentOptimizationSuggestion {
  id: string;
  userId: string;
  contentType: string;
  contentId?: string;
  suggestionType: string;
  originalContent: string;
  suggestedContent: string;
  reasoning: string;
  confidence: number;
  status: 'pending' | 'applied' | 'rejected';
  metrics?: any;
  createdAt: string;
}

interface ContentPerformanceHistory {
  id: string;
  userId: string;
  contentType: string;
  contentId: string;
  metric: string;
  value: string;
  timestamp: string;
  platform?: string;
  metadata?: any;
}

export default function ContentOptimization() {
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [originalContent, setOriginalContent] = useState('');
  const [suggestionType, setSuggestionType] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch optimization suggestions
  const { data: suggestions = [] } = useQuery<ContentOptimizationSuggestion[]>({
    queryKey: ['/api/optimization/suggestions'],
  });

  // Fetch performance history
  const { data: performance = [] } = useQuery<ContentPerformanceHistory[]>({
    queryKey: ['/api/optimization/performance'],
  });

  // Generate suggestion mutation
  const generateSuggestionMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/optimization/suggestions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/suggestions'] });
      toast({
        title: "Suggestions Generated",
        description: "AI has analyzed your content and generated optimization suggestions.",
      });
      setOriginalContent('');
      setSelectedContentType('');
      setSuggestionType('');
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate suggestions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Apply suggestion mutation
  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      await apiRequest('PUT', `/api/optimization/suggestions/${suggestionId}/apply`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/suggestions'] });
      toast({
        title: "Suggestion Applied",
        description: "The optimization suggestion has been applied to your content.",
      });
    },
  });

  // Reject suggestion mutation
  const rejectSuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      await apiRequest('PUT', `/api/optimization/suggestions/${suggestionId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/suggestions'] });
      toast({
        title: "Suggestion Rejected",
        description: "The suggestion has been marked as rejected.",
      });
    },
  });

  // Analyze performance mutation
  const analyzePerformanceMutation = useMutation({
    mutationFn: async (contentId: string) => {
      await apiRequest('POST', `/api/optimization/analyze/${contentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/performance'] });
      toast({
        title: "Analysis Complete",
        description: "Content performance analysis has been updated.",
      });
    },
  });

  const handleGenerateSuggestion = () => {
    if (!originalContent || !selectedContentType || !suggestionType) {
      toast({
        title: "Missing Information",
        description: "Please provide content, select content type and suggestion type.",
        variant: "destructive",
      });
      return;
    }

    generateSuggestionMutation.mutate({
      contentType: selectedContentType,
      suggestionType,
      originalContent,
    });
  };

  const getSuggestionTypeIcon = (type: string) => {
    switch (type) {
      case 'email_subject': return Icons.alert;
      case 'social_post': return Icons.shoppingCart;
      case 'radio_pitch': return Icons.user;
      case 'blog_content': return Icons.alert;
      case 'ad_copy': return Icons.alert;
      default: return Icons.alert;
    }
  };

  const getSuggestionTypeLabel = (type: string) => {
    switch (type) {
      case 'email_subject': return 'Email Subject Optimization';
      case 'social_post': return 'Social Media Post';
      case 'radio_pitch': return 'Radio Pitch Enhancement';
      case 'blog_content': return 'Blog Content Improvement';
      case 'ad_copy': return 'Advertisement Copy';
      default: return type.replace('_', ' ');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;
  const appliedSuggestions = suggestions.filter(s => s.status === 'applied').length;
  const totalAnalyzed = performance.length;
  const averageConfidence = suggestions.length > 0 ? 
    Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Optimization Lab</h2>
          <p className="text-gray-600">AI-powered content analysis and improvement suggestions</p>
        </div>
        <Badge className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
          🎯 AI Powered
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Suggestions</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingSuggestions}</p>
              </div>
              <Icons.alert className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Applied Suggestions</p>
                <p className="text-2xl font-bold text-green-600">{appliedSuggestions}</p>
              </div>
              <Icons.shoppingCart className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Content Analyzed</p>
                <p className="text-2xl font-bold text-blue-600">{totalAnalyzed}</p>
              </div>
              <Icons.user className="h-8 w-8 text-blue-500" />
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

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="generate">Generate New</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.alert className="h-5 w-5" />
                Optimization Suggestions
              </CardTitle>
              <CardDescription>
                AI-generated suggestions to improve your content performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions.map((suggestion) => {
                  const Icon = getSuggestionTypeIcon(suggestion.suggestionType);
                  return (
                    <div key={suggestion.id} className="border rounded-lg overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-indigo-500" />
                            <div>
                              <h4 className="font-medium">{getSuggestionTypeLabel(suggestion.suggestionType)}</h4>
                              <p className="text-sm text-gray-600">{suggestion.contentType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(suggestion.status)}>
                              {suggestion.status}
                            </Badge>
                            <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                              {suggestion.confidence}% confident
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Original Content:</p>
                            <div className="p-3 bg-gray-50 rounded border">
                              <p className="text-sm">{suggestion.originalContent}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Suggested Content:</p>
                            <div className="p-3 bg-blue-50 rounded border border-blue-200">
                              <p className="text-sm">{suggestion.suggestedContent}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">AI Reasoning:</p>
                          <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
                        </div>

                        {suggestion.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => applySuggestionMutation.mutate(suggestion.id)}
                              disabled={applySuggestionMutation.isPending}
                            >
                              Apply Suggestion
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectSuggestionMutation.mutate(suggestion.id)}
                              disabled={rejectSuggestionMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {suggestions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.alert className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No optimization suggestions yet. Generate your first AI analysis!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.shoppingCart className="h-5 w-5" />
                Content Performance
              </CardTitle>
              <CardDescription>
                Track how your content performs across different platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{item.contentType} Performance</h4>
                      <p className="text-sm text-gray-600">{item.metric}: {item.value}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.platform && (
                          <Badge variant="outline">{item.platform}</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => analyzePerformanceMutation.mutate(item.contentId)}
                      disabled={analyzePerformanceMutation.isPending}
                    >
                      Analyze
                    </Button>
                  </div>
                ))}
                {performance.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.shoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No performance data yet. Start analyzing your content!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.alert className="h-5 w-5" />
                Generate Optimization Suggestions
              </CardTitle>
              <CardDescription>
                Get AI-powered suggestions to improve your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contentType">Content Type</Label>
                    <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="radio_pitch">Radio Pitch</SelectItem>
                        <SelectItem value="blog_post">Blog Post</SelectItem>
                        <SelectItem value="advertisement">Advertisement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="suggestionType">Optimization Type</Label>
                    <Select value={suggestionType} onValueChange={setSuggestionType}>
                      <SelectTrigger>
                        <SelectValue placeholder="What to optimize" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="conversion">Conversion Rate</SelectItem>
                        <SelectItem value="clarity">Clarity & Readability</SelectItem>
                        <SelectItem value="emotional_impact">Emotional Impact</SelectItem>
                        <SelectItem value="call_to_action">Call-to-Action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="originalContent">Your Content</Label>
                    <Textarea
                      id="originalContent"
                      placeholder="Paste your content here for AI analysis..."
                      value={originalContent}
                      onChange={(e) => setOriginalContent(e.target.value)}
                      className="min-h-[120px]"
                    />
                  </div>

                  <Button
                    onClick={handleGenerateSuggestion}
                    disabled={generateSuggestionMutation.isPending}
                    className="w-full"
                  >
                    {generateSuggestionMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing Content...
                      </>
                    ) : (
                      <>
                        <Icons.alert className="w-4 h-4 mr-2" />
                        Generate AI Suggestions
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Optimization Type Descriptions */}
              {suggestionType && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h4 className="font-medium text-indigo-900 mb-2">
                    {suggestionType.replace('_', ' ').toUpperCase()} Optimization
                  </h4>
                  <p className="text-sm text-indigo-700">
                    {suggestionType === 'engagement' && 'AI will analyze your content to suggest improvements that increase audience engagement, likes, shares, and interaction rates.'}
                    {suggestionType === 'conversion' && 'Get suggestions to improve conversion rates, encouraging more people to take your desired action.'}
                    {suggestionType === 'clarity' && 'Improve the clarity and readability of your content to ensure your message is understood effectively.'}
                    {suggestionType === 'emotional_impact' && 'Enhance the emotional resonance of your content to create stronger connections with your audience.'}
                    {suggestionType === 'call_to_action' && 'Optimize your call-to-action elements to drive more clicks, responses, and desired behaviors.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.user className="h-5 w-5" />
                Optimization History
              </CardTitle>
              <CardDescription>
                Track your content optimization progress over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions.filter(s => s.status !== 'pending').map((suggestion) => (
                  <div key={suggestion.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{getSuggestionTypeLabel(suggestion.suggestionType)}</h4>
                      <p className="text-sm text-gray-600">{suggestion.contentType}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(suggestion.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(suggestion.status)}>
                        {suggestion.status}
                      </Badge>
                      <span className={`text-sm ${getConfidenceColor(suggestion.confidence)}`}>
                        {suggestion.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
                {suggestions.filter(s => s.status !== 'pending').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.user className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No optimization history yet. Apply some suggestions to see history!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}