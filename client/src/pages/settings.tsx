import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/lib/icons";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SecretField {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  icon: React.ElementType;
  category: "ai" | "github" | "nig" | "payment";
}

const secretFields: SecretField[] = [
  {
    key: "OPENAI_API_KEY",
    label: "OpenAI API Key",
    description: "Powers Sunshine AI assistant — required for all AI features",
    placeholder: "sk-...",
    icon: Icons.sparkles,
    category: "ai",
  },
  {
    key: "GITHUB_TOKEN",
    label: "GitHub Personal Access Token",
    description: "Enables automatic code sync to your GitHub repository",
    placeholder: "ghp_...",
    icon: Icons.github,
    category: "github",
  },
  {
    key: "NIG_API_KEY",
    label: "NIG Command Center API Key",
    description: "Authorizes this app to report status to the NIG Command Center",
    placeholder: "nig_...",
    icon: Icons.network,
    category: "nig",
  },
  {
    key: "DIVISION_NAME",
    label: "Division Name (NIG)",
    description: "How this app identifies itself to the NIG Command Center",
    placeholder: "My Life Assistant",
    icon: Icons.server,
    category: "nig",
  },
  {
    key: "STRIPE_SECRET_KEY",
    label: "Stripe Secret Key",
    description: "For invoice payment processing via Stripe",
    placeholder: "sk_live_...",
    icon: Icons.dollar,
    category: "payment",
  },
];

const GITHUB_REPO = "https://github.com/LordEnki7/mylifeassistant.git";

export default function Settings() {
  const { toast } = useToast();
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [gitStatus, setGitStatus] = useState<"idle" | "pushing" | "done" | "error">("idle");
  const [githubBranch, setGithubBranch] = useState("main");

  const saveKeyMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest("POST", "/api/settings/secret", { key, value });
    },
    onSuccess: (_, { key }) => {
      toast({
        title: "Secret Saved",
        description: `${key} has been updated successfully.`,
      });
      setKeyValues((prev) => ({ ...prev, [key]: "" }));
    },
    onError: () => {
      toast({
        title: "Failed to Save",
        description: "Could not save the secret. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveKey = (field: SecretField) => {
    const value = keyValues[field.key];
    if (!value?.trim()) {
      toast({
        title: "Empty Value",
        description: "Please enter a value before saving.",
        variant: "destructive",
      });
      return;
    }
    saveKeyMutation.mutate({ key: field.key, value: value.trim() });
  };

  const handleGitPush = async () => {
    setGitStatus("pushing");
    try {
      const res = await apiRequest("POST", "/api/github/push", { branch: githubBranch });
      setGitStatus("done");
      toast({
        title: "Code Pushed to GitHub",
        description: `Successfully pushed to ${GITHUB_REPO} on branch '${githubBranch}'.`,
      });
    } catch (err: any) {
      setGitStatus("error");
      toast({
        title: "Push Failed",
        description: err?.message || "Could not push to GitHub. Check your token and try again.",
        variant: "destructive",
      });
    }
    setTimeout(() => setGitStatus("idle"), 4000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Copied to clipboard." });
  };

  const categoryFields = (cat: SecretField["category"]) =>
    secretFields.filter((f) => f.category === cat);

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Icons.settings className="w-8 h-8 text-[hsl(43,67%,51%)]" />
          Settings & Integrations
        </h1>
        <p className="text-muted-foreground">Manage your API keys, GitHub sync, and NIG connections</p>
      </div>

      <Tabs defaultValue="apikeys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="apikeys" className="flex items-center gap-2">
            <Icons.key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="github" className="flex items-center gap-2">
            <Icons.github className="w-4 h-4" />
            GitHub
          </TabsTrigger>
          <TabsTrigger value="nig" className="flex items-center gap-2">
            <Icons.network className="w-4 h-4" />
            NIG Link
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="apikeys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.shield className="w-5 h-5 text-[hsl(43,67%,51%)]" />
                API Key Management
              </CardTitle>
              <CardDescription>
                Securely store and update your service API keys. Keys are stored as encrypted environment secrets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(["ai", "payment"] as SecretField["category"][]).map((cat) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    {cat === "ai" ? "AI Services" : "Payment Services"}
                  </h3>
                  <div className="space-y-4">
                    {categoryFields(cat).map((field) => (
                      <div key={field.key} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <field.icon className="w-4 h-4 text-[hsl(43,67%,51%)]" />
                            <div>
                              <Label className="font-medium">{field.label}</Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {field.key}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[field.key] ? "text" : "password"}
                              placeholder={field.placeholder}
                              value={keyValues[field.key] || ""}
                              onChange={(e) =>
                                setKeyValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="pr-10 font-mono text-sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowKeys((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                              }
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <Icons.eye className="w-4 h-4" />
                            </button>
                          </div>
                          <Button
                            onClick={() => handleSaveKey(field)}
                            disabled={saveKeyMutation.isPending}
                            className="btn-gold"
                          >
                            <Icons.lock className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GitHub Tab */}
        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.github className="w-5 h-5" />
                GitHub Integration
              </CardTitle>
              <CardDescription>
                Sync your app code to your GitHub repository for version control and backup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
                <Icons.gitBranch className="w-5 h-5 text-[hsl(43,67%,51%)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Connected Repository</p>
                  <p className="text-sm text-muted-foreground font-mono mt-1">{GITHUB_REPO}</p>
                  <button
                    onClick={() => copyToClipboard(GITHUB_REPO)}
                    className="flex items-center gap-1 text-xs text-[hsl(43,67%,51%)] hover:underline mt-1"
                  >
                    <Icons.copy className="w-3 h-3" />
                    Copy URL
                  </button>
                </div>
              </div>

              {/* GitHub Token */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icons.key className="w-4 h-4 text-[hsl(43,67%,51%)]" />
                  <Label className="font-medium">GitHub Personal Access Token</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate a token at{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[hsl(43,67%,51%)] hover:underline"
                  >
                    github.com/settings/tokens
                  </a>{" "}
                  — needs <code className="bg-muted px-1 rounded">repo</code> scope.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys["GITHUB_TOKEN"] ? "text" : "password"}
                      placeholder="ghp_..."
                      value={keyValues["GITHUB_TOKEN"] || ""}
                      onChange={(e) =>
                        setKeyValues((prev) => ({ ...prev, GITHUB_TOKEN: e.target.value }))
                      }
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowKeys((prev) => ({ ...prev, GITHUB_TOKEN: !prev["GITHUB_TOKEN"] }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <Icons.eye className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    onClick={() =>
                      handleSaveKey(secretFields.find((f) => f.key === "GITHUB_TOKEN")!)
                    }
                    disabled={saveKeyMutation.isPending}
                    className="btn-gold"
                  >
                    Save Token
                  </Button>
                </div>
              </div>

              {/* Push to GitHub */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icons.upload className="w-4 h-4 text-[hsl(43,67%,51%)]" />
                  <Label className="font-medium">Push Code to GitHub</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Commit and push the latest changes to your repository.
                </p>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <Label className="text-xs shrink-0 text-muted-foreground">Branch:</Label>
                    <Input
                      value={githubBranch}
                      onChange={(e) => setGithubBranch(e.target.value)}
                      className="text-sm font-mono"
                      placeholder="main"
                    />
                  </div>
                  <Button
                    onClick={handleGitPush}
                    disabled={gitStatus === "pushing"}
                    className="btn-navy shrink-0"
                  >
                    {gitStatus === "pushing" ? (
                      <>
                        <Icons.refresh className="w-4 h-4 mr-2 animate-spin" />
                        Pushing...
                      </>
                    ) : gitStatus === "done" ? (
                      <>
                        <Icons.checkCircle className="w-4 h-4 mr-2 text-green-400" />
                        Pushed!
                      </>
                    ) : (
                      <>
                        <Icons.upload className="w-4 h-4 mr-2" />
                        Push to GitHub
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NIG Tab */}
        <TabsContent value="nig" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.network className="w-5 h-5 text-[hsl(43,67%,51%)]" />
                NIG Command Center Link
              </CardTitle>
              <CardDescription>
                Connect this app to the NIG Command Center so it can monitor your division in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Endpoint Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icons.activity className="w-5 h-5 text-green-500" />
                  <p className="text-sm font-medium">Division Status Endpoint — Active</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This app is broadcasting real-time health data to the NIG Command Center via the
                  endpoint below.
                </p>
                <div className="bg-background border rounded p-2 font-mono text-xs flex items-center justify-between gap-2">
                  <span className="text-[hsl(43,67%,51%)]">GET</span>
                  <span className="flex-1">/api/nig-status</span>
                  <button
                    onClick={() => copyToClipboard("/api/nig-status")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icons.copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The NIG Command Center must send:{" "}
                  <code className="bg-muted px-1 rounded">Authorization: Bearer YOUR_NIG_API_KEY</code>
                </p>
              </div>

              {/* NIG API Key Input */}
              {categoryFields("nig").map((field) => (
                <div key={field.key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <field.icon className="w-4 h-4 text-[hsl(43,67%,51%)]" />
                      <div>
                        <Label className="font-medium">{field.label}</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {field.key}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type={showKeys[field.key] ? "text" : "password"}
                      placeholder={field.placeholder}
                      value={keyValues[field.key] || ""}
                      onChange={(e) =>
                        setKeyValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="font-mono text-sm"
                    />
                    <Button
                      onClick={() => handleSaveKey(field)}
                      disabled={saveKeyMutation.isPending}
                      className="btn-gold"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  How to connect from NIG Command Center:
                </p>
                <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Set the same <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">NIG_API_KEY</code> in both apps</li>
                  <li>In NIG Command Center, add this app's URL + <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/api/nig-status</code></li>
                  <li>NIG will poll this endpoint to get health, metrics, and status data</li>
                  <li>Set <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">DIVISION_NAME</code> to customize how this app appears in NIG</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
