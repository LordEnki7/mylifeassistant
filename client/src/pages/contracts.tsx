import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { MusicContract } from "@shared/schema";
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

const contractTypeColors = {
  artist_producer: "bg-blue-100 text-blue-800",
  booking: "bg-green-100 text-green-800", 
  sync_licensing: "bg-purple-100 text-purple-800",
  distribution: "bg-orange-100 text-orange-800",
  copyright: "bg-red-100 text-red-800",
  production_distribution: "bg-indigo-100 text-indigo-800",
  joint_partnership: "bg-cyan-100 text-cyan-800",
  joint_venture: "bg-teal-100 text-teal-800",
  master_use_license: "bg-amber-100 text-amber-800",
  merchandise_licensing: "bg-rose-100 text-rose-800",
  payment_obligation: "bg-gray-100 text-gray-800",
  photographer: "bg-pink-100 text-pink-800",
  producer_manager: "bg-violet-100 text-violet-800",
  producer_assistant: "bg-emerald-100 text-emerald-800",
};

const contractTypeLabels = {
  artist_producer: "Artist-Producer",
  booking: "Live Booking",
  sync_licensing: "Sync Licensing", 
  distribution: "Distribution",
  copyright: "Copyright Assignment",
  production_distribution: "Production/Distribution",
  joint_partnership: "Joint Partnership",
  joint_venture: "Joint Venture",
  master_use_license: "Master Use License",
  merchandise_licensing: "Merchandise Licensing",
  payment_obligation: "Payment Obligation",
  photographer: "Photography",
  producer_manager: "Producer/Manager",
  producer_assistant: "Producer Assistant",
};

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const [selectedContract, setSelectedContract] = useState<MusicContract | null>(null);
  const [generatedContract, setGeneratedContract] = useState<string>("");
  const [contractVariables, setContractVariables] = useState<Record<string, string>>({});
  const [showGenerated, setShowGenerated] = useState(false);

  const { data: contracts = [], isLoading } = useQuery<MusicContract[]>({
    queryKey: ["/api/music-contracts"],
  });

  const generateMutation = useMutation({
    mutationFn: async ({ templateId, variables }: { templateId: string; variables: Record<string, string> }) => {
      const response = await apiRequest(`/api/music-contracts/${templateId}/generate`, {
        method: "POST",
        body: JSON.stringify({ variables }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response;
    },
    onSuccess: (data: any) => {
      setGeneratedContract(data.generatedContract || data.contract || '');
      setShowGenerated(true);
    },
  });

  const handleGenerateContract = (contract: MusicContract) => {
    setSelectedContract(contract);
    // Initialize variables with default values
    const initialVariables: Record<string, string> = {};
    if (contract.variables) {
      Object.entries(contract.variables).forEach(([key, defaultValue]) => {
        initialVariables[key] = typeof defaultValue === 'string' ? defaultValue : '';
      });
    }
    setContractVariables(initialVariables);
  };

  const handleVariableChange = (key: string, value: string) => {
    setContractVariables(prev => ({ ...prev, [key]: value }));
  };

  const submitGeneration = () => {
    if (!selectedContract) return;
    generateMutation.mutate({
      templateId: selectedContract.id,
      variables: contractVariables
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  const templateContracts = contracts.filter(c => c.status === "template");
  const draftContracts = contracts.filter(c => c.status === "draft");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Music Contracts</h1>
          <p className="text-gray-600 mt-2">
            Professional contract templates for your music business
          </p>
        </div>
      </div>

      {/* Contract Templates */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Contract Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{contract.name}</CardTitle>
                    <Badge className={contractTypeColors[contract.type as keyof typeof contractTypeColors]}>
                      {contractTypeLabels[contract.type as keyof typeof contractTypeLabels]}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {contract.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contract.tags && contract.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {contract.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <Button 
                      className="w-full" 
                      onClick={() => handleGenerateContract(contract)}
                    >
                      <Icons.fileText className="w-4 h-4 mr-2" />
                      Generate Contract
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {draftContracts.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Draft Contracts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftContracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{contract.name}</CardTitle>
                      <Badge variant="outline">Draft</Badge>
                    </div>
                    <CardDescription>
                      Created: {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : 'Unknown'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Icons.edit className="w-4 h-4 mr-2" />
                      Edit Contract
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contract Generation Dialog */}
      <Dialog open={!!selectedContract && !showGenerated} onOpenChange={(open) => !open && setSelectedContract(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate {selectedContract?.name}</DialogTitle>
            <DialogDescription>
              Fill in the contract details to generate your personalized agreement.
            </DialogDescription>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-4">
              {selectedContract.variables && Object.entries(selectedContract.variables).map(([key, defaultValue]) => {
                const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const placeholder = String(defaultValue || '');
                const isTextArea = key.includes('signature') || key.includes('terms') || key.includes('requirements');
                
                return (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {displayKey}
                    </Label>
                    {isTextArea ? (
                      <Textarea
                        id={key}
                        placeholder={placeholder}
                        value={contractVariables[key] || ''}
                        onChange={(e) => handleVariableChange(key, e.target.value)}
                        className="min-h-[80px]"
                      />
                    ) : (
                      <Input
                        id={key}
                        placeholder={placeholder}
                        value={contractVariables[key] || ''}
                        onChange={(e) => handleVariableChange(key, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedContract(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={submitGeneration}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate Contract'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generated Contract Display */}
      <Dialog open={showGenerated} onOpenChange={(open) => !open && setShowGenerated(false)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Contract</DialogTitle>
            <DialogDescription>
              Your personalized contract is ready. Review and save as needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-6 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {generatedContract}
              </pre>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowGenerated(false)}>
                Close
              </Button>
              <Button onClick={() => {
                navigator.clipboard.writeText(generatedContract);
                // Could add a toast notification here
              }}>
                <Icons.clipboard className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}