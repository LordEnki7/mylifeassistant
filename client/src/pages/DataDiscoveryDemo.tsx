import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Brain, Search, Zap, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DemoResponse {
  message: string;
  confidence: number;
  discoveredData?: Array<{
    type: string;
    data: any;
    relevance: number;
  }>;
  actions?: Array<{
    type: string;
    data: any;
  }>;
  demonstration: {
    architecture: string;
    components: string[];
    discoveredDataCount: number;
    actionsExecuted: number;
    systemInfo: string;
  };
}

export default function DataDiscoveryDemo() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<DemoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDemo = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      const result = await apiRequest('POST', '/api/sunshine/demo', { message });
      setResponse(result);
    } catch (error) {
      console.error('Demo failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const demoExamples = [
    "Create a task to research legal tech grants for C.A.R.E.N.",
    "Find contacts in the AI safety field and create a networking task",
    "Search for consumer protection grants and add the best ones",
    "Help me organize C.A.R.E.N. project requirements"
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Sunshine AI - Modular Architecture Demo
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Experience the new intelligent data discovery system with clean, modular AI architecture
        </p>
      </div>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Modular AI Architecture
          </CardTitle>
          <CardDescription>
            Clean separation of concerns with intelligent data discovery capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <Search className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-semibold">Data Discovery</h3>
              <p className="text-sm text-muted-foreground">
                Autonomously finds relevant data across all systems
              </p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <Brain className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-semibold">AI Core</h3>
              <p className="text-sm text-muted-foreground">
                Processes requests with contextual intelligence
              </p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-semibold">Action Executor</h3>
              <p className="text-sm text-muted-foreground">
                Automatically executes tasks and creates content
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Try the Demo</CardTitle>
          <CardDescription>
            Test the intelligent data discovery and autonomous task completion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask Sunshine to help with C.A.R.E.N. project tasks..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleDemo()}
            />
            <Button onClick={handleDemo} disabled={loading || !message.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Demo'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {demoExamples.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setMessage(example)}
                disabled={loading}
              >
                {example}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {response && (
        <div className="space-y-4">
          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>System Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="font-medium">{response.message}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(response.confidence * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Confidence</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {response.demonstration.discoveredDataCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Data Found</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {response.demonstration.actionsExecuted}
                  </div>
                  <div className="text-sm text-muted-foreground">Actions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {response.demonstration.components.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Components</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discovered Data */}
          {response.discoveredData && response.discoveredData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Discovered Data
                </CardTitle>
                <CardDescription>
                  Relevant items found across all systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {response.discoveredData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          <span className="font-medium">
                            {item.data.title || item.data.name || item.data.organization}
                          </span>
                        </div>
                        {item.data.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.data.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {Math.round(item.relevance * 100)}% match
                        </div>
                        <Progress value={item.relevance * 100} className="w-20 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions Executed */}
          {response.actions && response.actions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Actions Executed
                </CardTitle>
                <CardDescription>
                  Autonomous tasks completed by Sunshine
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {response.actions.map((action, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Check className="w-5 h-5 text-green-500" />
                      <div className="flex-1">
                        <div className="font-medium capitalize">
                          {action.type.replace('_', ' ')}
                        </div>
                        {action.data.title && (
                          <div className="text-sm text-muted-foreground">
                            "{action.data.title}"
                          </div>
                        )}
                      </div>
                      <Badge variant={action.data.success ? "default" : "destructive"}>
                        {action.data.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Architecture Info */}
          <Card>
            <CardHeader>
              <CardTitle>Architecture Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">System Architecture</h4>
                  <p className="text-sm text-muted-foreground">{response.demonstration.architecture}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Active Components</h4>
                  <div className="flex flex-wrap gap-1">
                    {response.demonstration.components.map((component, index) => (
                      <Badge key={index} variant="secondary">{component}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {response.demonstration.systemInfo}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}