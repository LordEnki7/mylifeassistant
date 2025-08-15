import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { KnowledgeDoc } from "@shared/schema";

export default function Knowledge() {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    tags: "",
    source: "",
    citation: "",
  });

  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery<KnowledgeDoc[]>({
    queryKey: ["/api/knowledge-docs"],
  });

  const addDocMutation = useMutation({
    mutationFn: async (data: any) => {
      const docData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map((tag: string) => tag.trim()) : [],
      };
      const response = await apiRequest("POST", "/api/knowledge-docs", docData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-docs"] });
      setIsAdding(false);
      setFormData({
        title: "",
        content: "",
        category: "general",
        tags: "",
        source: "",
        citation: "",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addDocMutation.mutate(formData);
  };

  const categoryColors = {
    legal: "bg-red-100 text-red-800",
    finance: "bg-green-100 text-green-800",
    business: "bg-blue-100 text-blue-800",
    general: "bg-gray-100 text-gray-800",
  };

  const categoryIcons = {
    legal: Icons.building,
    finance: Icons.dollar,
    business: Icons.user,
    general: Icons.book,
  };

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesFilter = filterCategory === "all" || doc.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const getCategoryStats = () => {
    const stats = docs.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return stats;
  };

  const categoryStats = getCategoryStats();

  // Sample knowledge base entries to show structure
  const sampleDocs: KnowledgeDoc[] = [
    {
      id: "sample-1",
      userId: "demo-user",
      title: "Music Copyright Basics",
      content: "Copyright law protects original musical works including melody, harmony, rhythm, and lyrics. The moment you create and fix a musical work in tangible form, you automatically own the copyright. Key points:\n\n• Duration: Life of author + 70 years\n• Rights included: Reproduction, distribution, performance, display, derivative works\n• Registration: While automatic, formal registration provides additional legal benefits\n• Work for hire: Employer owns copyright when music created within employment scope",
      category: "legal",
      tags: ["copyright", "intellectual-property", "music-law"],
      source: "U.S. Copyright Office",
      citation: "Circular 56A: Copyright Registration for Musical Compositions",
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "sample-2", 
      userId: "demo-user",
      title: "Music Business Tax Deductions",
      content: "Common tax deductions for music professionals:\n\n• Equipment: Instruments, recording gear, software\n• Home studio: Portion of rent/mortgage for dedicated workspace\n• Professional services: Legal fees, accounting, management\n• Marketing: Website costs, promotional materials, advertising\n• Travel: Performance venues, recording studios, industry events\n• Education: Music lessons, workshops, industry conferences\n\nKeep detailed records and receipts. Consult with a tax professional familiar with music industry specifics.",
      category: "finance",
      tags: ["taxes", "deductions", "business-expenses"],
      source: "IRS Publication 535",
      citation: "Business Expenses Guide for Creative Professionals",
      createdAt: new Date("2024-01-20"),
    }
  ];

  const allDocs = [...docs, ...sampleDocs];
  const filteredAllDocs = allDocs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesFilter = filterCategory === "all" || doc.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Knowledge Base</h1>
          <p className="text-gray-600">Curated information on legal, financial, business, and industry topics.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center w-full sm:w-auto">
          <Icons.plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.entries(categoryColors).map(([category, colorClass]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          const count = categoryStats[category] || 0;
          return (
            <Card 
              key={category}
              className={`material-card cursor-pointer transition-all hover:material-card-elevated ${
                filterCategory === category ? "ring-2 ring-primary-500" : ""
              }`}
              onClick={() => setFilterCategory(filterCategory === category ? "all" : category)}
            >
              <CardContent className="p-4 text-center">
                <Icon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <h3 className="font-semibold text-gray-900 capitalize">{category}</h3>
                <p className="text-2xl font-bold text-primary-600">{count + (category === "legal" ? 1 : category === "finance" ? 1 : 0)}</p>
                <p className="text-xs text-gray-500">documents</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filter */}
      <Card className="material-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                <option value="legal">Legal</option>
                <option value="finance">Finance</option>
                <option value="business">Business</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdding && (
        <Card className="material-card mb-8">
          <CardHeader>
            <CardTitle>Add Knowledge Document</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Music Licensing Basics"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="legal">Legal</option>
                    <option value="finance">Finance</option>
                    <option value="business">Business</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <Input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="copyright, licensing, contracts (comma separated)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <Input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g., U.S. Copyright Office"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Citation
                  </label>
                  <Input
                    type="text"
                    value={formData.citation}
                    onChange={(e) => setFormData({ ...formData, citation: e.target.value })}
                    placeholder="Full citation or reference"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detailed information, notes, key points, etc."
                  className="min-h-[200px]"
                  required
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
                  disabled={addDocMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {addDocMutation.isPending ? "Adding..." : "Add Document"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Document View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={categoryColors[selectedDoc.category as keyof typeof categoryColors]}>
                    {selectedDoc.category}
                  </Badge>
                  <CardTitle className="text-xl">{selectedDoc.title}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDoc(null)}
                >
                  <Icons.close className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900">
                    {selectedDoc.content}
                  </pre>
                </div>
                
                {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDoc.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {(selectedDoc.source || selectedDoc.citation) && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Source Information:</h4>
                    {selectedDoc.source && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Source:</span> {selectedDoc.source}
                      </p>
                    )}
                    {selectedDoc.citation && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Citation:</span> {selectedDoc.citation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Document List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))
        ) : filteredAllDocs.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Icons.book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterCategory !== "all" ? "No documents found" : "No knowledge documents yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterCategory !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Start building your knowledge base with legal, financial, and business information."
                }
              </p>
              {!searchQuery && filterCategory === "all" && (
                <Button onClick={() => setIsAdding(true)}>
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredAllDocs.map((doc) => {
            const Icon = categoryIcons[doc.category as keyof typeof categoryIcons];
            return (
              <Card 
                key={doc.id} 
                className="material-card hover:material-card-elevated transition-all cursor-pointer"
                onClick={() => setSelectedDoc(doc)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{doc.title}</CardTitle>
                        <Badge className={`${categoryColors[doc.category as keyof typeof categoryColors]} mt-1`}>
                          {doc.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {doc.content}
                    </p>
                    
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                        {doc.tags.length > 3 && (
                          <span className="inline-block text-gray-500 text-xs px-2 py-1">
                            +{doc.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                      {doc.source && (
                        <span className="truncate">Source: {doc.source}</span>
                      )}
                      <span className="flex-shrink-0">
                        Added: {new Date(doc.createdAt!).toLocaleDateString()}
                      </span>
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
