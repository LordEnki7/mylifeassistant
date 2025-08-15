import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Scale, Copy, Eye, Download, Edit, Trash2 } from "lucide-react";

interface LegalDocumentTemplate {
  id: string;
  title: string;
  description?: string;
  category: string;
  documentType: string;
  recipient?: string;
  template: string;
  variables?: Record<string, any>;
  legalBasis?: string[];
  escalationLevel: number;
  instructions?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GenerateDocumentDialogProps {
  template: LegalDocumentTemplate;
  onGenerate: (document: string) => void;
}

function GenerateDocumentDialog({ template, onGenerate }: GenerateDocumentDialogProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/legal-document-templates/${template.id}/generate`, { variables });
      return response.json();
    },
    onSuccess: (data) => {
      onGenerate(data.document);
      setOpen(false);
      toast({
        title: "Document Generated",
        description: "Your legal document has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const templateVariables = template.variables || {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Generate Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate: {template.title}</DialogTitle>
          <DialogDescription>
            Fill in the template variables to generate your personalized legal document.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {Object.entries(templateVariables).map(([key, defaultValue]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="text-sm font-medium">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Label>
              {key.includes('address') || key.includes('instructions') ? (
                <Textarea
                  id={key}
                  placeholder={String(defaultValue)}
                  value={variables[key] || ''}
                  onChange={(e) => handleVariableChange(key, e.target.value)}
                  className="min-h-[80px]"
                />
              ) : (
                <Input
                  id={key}
                  placeholder={String(defaultValue)}
                  value={variables[key] || ''}
                  onChange={(e) => handleVariableChange(key, e.target.value)}
                />
              )}
            </div>
          ))}
          
          {template.instructions && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
              <p className="text-sm text-blue-800">{template.instructions}</p>
            </div>
          )}
          
          <Button 
            onClick={() => generateMutation.mutate()} 
            disabled={generateMutation.isPending}
            className="w-full"
          >
            {generateMutation.isPending ? "Generating..." : "Generate Document"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DocumentPreviewDialogProps {
  document: string;
  title: string;
}

function DocumentPreviewDialog({ document, title }: DocumentPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(document);
    toast({
      title: "Copied!",
      description: "Document copied to clipboard.",
    });
  };

  const downloadDocument = () => {
    const blob = new Blob([document], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button onClick={downloadDocument} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>
        <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm font-mono">{document}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function LegalDocuments() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [generatedDocument, setGeneratedDocument] = useState<string>("");
  const [generatedDocumentTitle, setGeneratedDocumentTitle] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/legal-document-templates'],
  });

  const categories = Array.from(new Set(templates.map((t: LegalDocumentTemplate) => t.category)));
  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter((t: LegalDocumentTemplate) => t.category === selectedCategory);

  const handleDocumentGenerated = (document: string, title: string) => {
    setGeneratedDocument(document);
    setGeneratedDocumentTitle(title);
  };

  const getEscalationBadgeColor = (level: number) => {
    switch (level) {
      case 1: return "default";
      case 2: return "secondary";
      case 3: return "destructive";
      case 4: return "outline";
      default: return "default";
    }
  };

  const getEscalationLabel = (level: number) => {
    switch (level) {
      case 1: return "Initial";
      case 2: return "Second Notice";
      case 3: return "Final Warning";
      case 4: return "Settlement Offer";
      default: return `Level ${level}`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading legal document templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Scale className="w-8 h-8 text-blue-600" />
            Legal Document Templates
          </h1>
          <p className="text-gray-600 mt-2">
            Generate professional legal documents for FCRA disputes, debt validation, and consumer protection
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="credit_dispute">Credit Disputes</TabsTrigger>
          <TabsTrigger value="debt_validation">Debt Validation</TabsTrigger>
          <TabsTrigger value="cease_desist">Cease & Desist</TabsTrigger>
          <TabsTrigger value="settlement">Settlement</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-6">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {selectedCategory === "all" 
                    ? "No legal document templates have been created yet. Add your first template to get started."
                    : `No templates found in the ${selectedCategory.replace('_', ' ')} category.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template: LegalDocumentTemplate) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg line-clamp-2">{template.title}</CardTitle>
                      <Badge variant={getEscalationBadgeColor(template.escalationLevel)}>
                        {getEscalationLabel(template.escalationLevel)}
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{template.category.replace('_', ' ')}</Badge>
                      <Badge variant="outline">{template.documentType}</Badge>
                      {template.recipient && (
                        <Badge variant="secondary">{template.recipient}</Badge>
                      )}
                    </div>
                    
                    {template.legalBasis && template.legalBasis.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Legal Basis:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.legalBasis.map((basis, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {basis}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <GenerateDocumentDialog 
                        template={template}
                        onGenerate={(doc) => handleDocumentGenerated(doc, template.title)}
                      />
                      <DocumentPreviewDialog 
                        document={template.template}
                        title={template.title}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {generatedDocument && (
        <DocumentPreviewDialog 
          document={generatedDocument}
          title={generatedDocumentTitle}
        />
      )}
    </div>
  );
}