import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { Audiobook, AudiobookSale } from "@shared/schema";
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

const audienceColors = {
  adult: "bg-blue-100 text-blue-800",
  young_adult: "bg-purple-100 text-purple-800",
  children: "bg-green-100 text-green-800",
};

const statusColors = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
};

const rightsColors = {
  owned: "bg-emerald-100 text-emerald-800",
  licensed: "bg-orange-100 text-orange-800",
  pending: "bg-red-100 text-red-800",
};

export default function AudiobooksPage() {
  const queryClient = useQueryClient();
  const [selectedBook, setSelectedBook] = useState<Audiobook | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    genre: "",
    description: "",
    targetAudience: "",
    price: "",
    series: "",
    seriesBook: "",
  });

  const { data: audiobooks = [], isLoading } = useQuery<Audiobook[]>({
    queryKey: ["/api/audiobooks"],
  });

  const { data: sales = [] } = useQuery<AudiobookSale[]>({
    queryKey: ["/api/audiobook-sales"],
  });

  const createMutation = useMutation({
    mutationFn: async (newBook: any) => {
      const response = await apiRequest("POST", "/api/audiobooks", newBook);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audiobooks"] });
      setShowAddDialog(false);
      setBookData({
        title: "",
        author: "",
        genre: "",
        description: "",
        targetAudience: "",
        price: "",
        series: "",
        seriesBook: "",
      });
    },
  });

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "Unknown";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "Free";
    return `$${price}`;
  };

  const handleSubmit = () => {
    const bookToCreate = {
      ...bookData,
      seriesBook: bookData.seriesBook ? parseInt(bookData.seriesBook) : null,
      targetAudience: bookData.targetAudience || null,
      series: bookData.series || null,
    };
    createMutation.mutate(bookToCreate);
  };

  const getBookSales = (bookId: string) => {
    return sales.filter(sale => sale.audiobookId === bookId);
  };

  const getTotalRevenue = (bookId: string) => {
    const bookSales = getBookSales(bookId);
    return bookSales.reduce((total, sale) => total + parseFloat(sale.amount), 0).toFixed(2);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Audiobooks</h1>
          <p className="text-gray-600 mt-2">
            Manage your audiobook collection and track sales performance
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Icons.plus className="w-4 h-4 mr-2" />
          Add Audiobook
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Icons.book className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Books</p>
                <p className="text-2xl font-bold text-gray-900">{audiobooks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Icons.dollar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${sales.reduce((total, sale) => total + parseFloat(sale.amount), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Icons.shoppingCart className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {audiobooks.reduce((total, book) => total + (book.totalSales || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Icons.trending className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Books</p>
                <p className="text-2xl font-bold text-gray-900">
                  {audiobooks.filter(book => book.promotionStatus === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audiobooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {audiobooks.map((book) => {
          const bookSales = getBookSales(book.id);
          return (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{book.title}</CardTitle>
                    <CardDescription>by {book.author}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    {book.targetAudience && (
                      <Badge className={audienceColors[book.targetAudience as keyof typeof audienceColors]}>
                        {book.targetAudience.replace('_', ' ')}
                      </Badge>
                    )}
                    <Badge className={statusColors[book.promotionStatus as keyof typeof statusColors]}>
                      {book.promotionStatus}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-600">Genre</p>
                      <p>{book.genre}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Duration</p>
                      <p>{formatDuration(book.duration)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Price</p>
                      <p>{formatPrice(book.price)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Revenue</p>
                      <p>${getTotalRevenue(book.id)}</p>
                    </div>
                  </div>

                  {book.series && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Series</p>
                      <p className="text-sm">
                        {book.series} {book.seriesBook && `#${book.seriesBook}`}
                      </p>
                    </div>
                  )}

                  {book.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Description</p>
                      <p className="text-sm text-gray-700 line-clamp-3">{book.description}</p>
                    </div>
                  )}

                  {book.salesPlatforms && book.salesPlatforms.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Available On</p>
                      <div className="flex flex-wrap gap-1">
                        {book.salesPlatforms.map((platform) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedBook(book);
                        setShowSalesDialog(true);
                      }}
                    >
                      <Icons.barChart className="w-4 h-4 mr-2" />
                      Sales ({bookSales.length})
                    </Button>
                    <Button variant="outline" size="sm">
                      <Icons.edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Audiobook Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Audiobook</DialogTitle>
            <DialogDescription>
              Enter the details for your new audiobook.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={bookData.title}
                  onChange={(e) => setBookData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Book title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  value={bookData.author}
                  onChange={(e) => setBookData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Author name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="genre">Genre *</Label>
                <Input
                  id="genre"
                  value={bookData.genre}
                  onChange={(e) => setBookData(prev => ({ ...prev, genre: e.target.value }))}
                  placeholder="e.g., Romance, Fantasy, Non-fiction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select 
                  value={bookData.targetAudience} 
                  onValueChange={(value) => setBookData(prev => ({ ...prev, targetAudience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="young_adult">Young Adult</SelectItem>
                    <SelectItem value="children">Children</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={bookData.price}
                  onChange={(e) => setBookData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="24.99"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="series">Series Name</Label>
                <Input
                  id="series"
                  value={bookData.series}
                  onChange={(e) => setBookData(prev => ({ ...prev, series: e.target.value }))}
                  placeholder="Series name (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seriesBook">Book # in Series</Label>
                <Input
                  id="seriesBook"
                  type="number"
                  value={bookData.seriesBook}
                  onChange={(e) => setBookData(prev => ({ ...prev, seriesBook: e.target.value }))}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={bookData.description}
                onChange={(e) => setBookData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your audiobook..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!bookData.title || !bookData.author || !bookData.genre || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  'Add Audiobook'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Details Dialog */}
      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sales for "{selectedBook?.title}"</DialogTitle>
            <DialogDescription>
              Sales data and revenue tracking for this audiobook.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBook && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold">{getBookSales(selectedBook.id).length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">${getTotalRevenue(selectedBook.id)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold">${selectedBook.monthlyRevenue}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Sales</h3>
                {getBookSales(selectedBook.id).length > 0 ? (
                  <div className="space-y-2">
                    {getBookSales(selectedBook.id).slice(0, 10).map((sale) => (
                      <div key={sale.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{sale.platform}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(sale.saleDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${sale.amount}</p>
                          <p className="text-sm text-gray-600">{sale.currency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 italic">No sales recorded yet.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}