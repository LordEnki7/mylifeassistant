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
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface RealTimeMetric {
  id: string;
  userId: string;
  jobId?: string;
  campaignId?: string;
  metricType: string;
  currentValue: string;
  alertThreshold?: string;
  isAlertTriggered: boolean;
  timeWindow: string;
  metadata?: any;
  createdAt: string;
}

interface MetricAlert {
  id: string;
  metricId: string;
  alertType: string;
  threshold: string;
  isActive: boolean;
  lastTriggered?: string;
}

export default function RealTimeMonitoring() {
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [timeWindow, setTimeWindow] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch real-time metrics
  const { data: metrics = [], isLoading } = useQuery<RealTimeMetric[]>({
    queryKey: ['/api/monitoring/metrics'],
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if enabled
  });

  // Fetch metric alerts
  const { data: alerts = [] } = useQuery<MetricAlert[]>({
    queryKey: ['/api/monitoring/alerts'],
    refetchInterval: autoRefresh ? 60000 : false, // Refresh every minute
  });

  // Create new metric mutation
  const createMetricMutation = useMutation({
    mutationFn: async (metricData: any) => {
      await apiRequest('POST', '/api/monitoring/metrics', metricData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/metrics'] });
      toast({
        title: "Metric Added",
        description: "Real-time monitoring metric has been created.",
      });
      setSelectedMetric('');
      setAlertThreshold('');
    },
    onError: () => {
      toast({
        title: "Failed to Add Metric",
        description: "Could not create monitoring metric. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update alert threshold mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({ metricId, threshold }: { metricId: string; threshold: string }) => {
      await apiRequest('PUT', `/api/monitoring/metrics/${metricId}/alert`, { threshold });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/metrics'] });
      toast({
        title: "Alert Updated",
        description: "Alert threshold has been updated.",
      });
    },
  });

  // Clear alert mutation
  const clearAlertMutation = useMutation({
    mutationFn: async (metricId: string) => {
      await apiRequest('POST', `/api/monitoring/metrics/${metricId}/clear-alert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitoring/metrics'] });
      toast({
        title: "Alert Cleared",
        description: "Alert has been cleared and reset.",
      });
    },
  });

  const handleCreateMetric = () => {
    if (!selectedMetric) {
      toast({
        title: "Missing Information",
        description: "Please select a metric type to monitor.",
        variant: "destructive",
      });
      return;
    }

    createMetricMutation.mutate({
      metricType: selectedMetric,
      alertThreshold: alertThreshold || null,
      timeWindow,
    });
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'email_open_rate': return Icons.alert;
      case 'campaign_engagement': return Icons.shoppingCart;
      case 'radio_response_rate': return Icons.user;
      case 'sync_submission_rate': return Icons.alert;
      case 'content_performance': return Icons.alert;
      default: return Icons.alert;
    }
  };

  const getMetricLabel = (type: string) => {
    switch (type) {
      case 'email_open_rate': return 'Email Open Rate';
      case 'campaign_engagement': return 'Campaign Engagement';
      case 'radio_response_rate': return 'Radio Response Rate';
      case 'sync_submission_rate': return 'Sync Submission Rate';
      case 'content_performance': return 'Content Performance';
      default: return type.replace('_', ' ');
    }
  };

  const getStatusColor = (isTriggered: boolean) => {
    return isTriggered 
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-green-100 text-green-800 border-green-200';
  };

  const activeAlerts = metrics.filter(m => m.isAlertTriggered).length;
  const totalMetrics = metrics.length;
  const averageValue = metrics.length > 0 ? 
    Math.round(metrics.reduce((sum, m) => sum + parseFloat(m.currentValue), 0) / metrics.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time Monitoring</h2>
          <p className="text-gray-600">Monitor your marketing performance with live metrics and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={autoRefresh ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Badge>
          <Switch 
            checked={autoRefresh} 
            onCheckedChange={setAutoRefresh}
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Metrics</p>
                <p className="text-2xl font-bold text-blue-600">{totalMetrics}</p>
              </div>
              <Icons.alert className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{activeAlerts}</p>
              </div>
              <Icons.alert className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Performance</p>
                <p className="text-2xl font-bold text-green-600">{averageValue}%</p>
              </div>
              <Icons.shoppingCart className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-emerald-600">Online</p>
              </div>
              <Icons.user className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.alert className="h-5 w-5" />
              Live Metrics
            </CardTitle>
            <CardDescription>
              Real-time monitoring of your marketing performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div>
                        <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="w-20 h-3 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.map((metric) => {
                  const Icon = getMetricIcon(metric.metricType);
                  return (
                    <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium">{getMetricLabel(metric.metricType)}</h4>
                          <p className="text-sm text-gray-600">{metric.timeWindow} window</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-lg font-bold">{metric.currentValue}%</p>
                          {metric.alertThreshold && (
                            <p className="text-xs text-gray-500">Threshold: {metric.alertThreshold}%</p>
                          )}
                        </div>
                        <Badge className={getStatusColor(metric.isAlertTriggered)}>
                          {metric.isAlertTriggered ? 'Alert' : 'Normal'}
                        </Badge>
                        {metric.isAlertTriggered && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => clearAlertMutation.mutate(metric.id)}
                            disabled={clearAlertMutation.isPending}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {metrics.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Icons.alert className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No metrics being monitored yet. Add your first metric!</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add New Metric */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.alert className="h-5 w-5" />
              Add New Metric
            </CardTitle>
            <CardDescription>
              Set up monitoring for important marketing metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="metricType">Metric Type</Label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metric to monitor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_open_rate">Email Open Rate</SelectItem>
                  <SelectItem value="campaign_engagement">Campaign Engagement</SelectItem>
                  <SelectItem value="radio_response_rate">Radio Response Rate</SelectItem>
                  <SelectItem value="sync_submission_rate">Sync Submission Rate</SelectItem>
                  <SelectItem value="content_performance">Content Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeWindow">Time Window</Label>
              <Select value={timeWindow} onValueChange={setTimeWindow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
              <Input
                id="alertThreshold"
                type="number"
                placeholder="e.g., 25"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Alert when metric falls below this value (optional)
              </p>
            </div>

            <Button
              onClick={handleCreateMetric}
              disabled={createMetricMutation.isPending}
              className="w-full"
            >
              {createMetricMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding Metric...
                </>
              ) : (
                <>
                  <Icons.alert className="w-4 h-4 mr-2" />
                  Add Monitoring Metric
                </>
              )}
            </Button>

            {/* Metric Type Descriptions */}
            {selectedMetric && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">
                  {getMetricLabel(selectedMetric)}
                </h4>
                <p className="text-sm text-blue-700">
                  {selectedMetric === 'email_open_rate' && 'Monitor the percentage of emails that are opened by recipients across all your campaigns.'}
                  {selectedMetric === 'campaign_engagement' && 'Track engagement rates including clicks, responses, and conversions from marketing campaigns.'}
                  {selectedMetric === 'radio_response_rate' && 'Monitor response rates from radio station outreach efforts and follow-up communications.'}
                  {selectedMetric === 'sync_submission_rate' && 'Track the success rate of sync licensing submissions and supervisor responses.'}
                  {selectedMetric === 'content_performance' && 'Monitor performance metrics for your content across all platforms and channels.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}