import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { Invoice } from "@shared/schema";

export default function Invoices() {
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsCreating(false);
      setFormData({
        clientName: "",
        clientEmail: "",
        amount: "",
        description: "",
        dueDate: "",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Invoice> }) => {
      const response = await apiRequest("PUT", `/api/invoices/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvoiceMutation.mutate(formData);
  };

  const handleStatusChange = (invoiceId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    if (newStatus === "paid") {
      updateData.paidDate = new Date().toISOString();
    }
    updateInvoiceMutation.mutate({
      id: invoiceId,
      data: updateData,
    });
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filterStatus === "all") return true;
    return invoice.status === filterStatus;
  });

  const getTotalAmount = (status?: string) => {
    const invoicesToSum = status 
      ? invoices.filter(inv => inv.status === status)
      : invoices;
    
    return invoicesToSum.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  };

  const getOverdueInvoices = () => {
    const today = new Date();
    return invoices.filter(invoice => {
      if (invoice.status === "paid" || !invoice.dueDate) return false;
      return new Date(invoice.dueDate) < today;
    });
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === "paid" || !invoice.dueDate) return false;
    return new Date(invoice.dueDate) < new Date();
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Invoices</h1>
          <p className="text-gray-600">Create and manage invoices for your freelance work and services.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center w-full sm:w-auto">
          <Icons.plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Invoice Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="material-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${getTotalAmount("paid").toLocaleString()}
                </p>
              </div>
              <Icons.dollar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="material-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(getTotalAmount("sent")).toLocaleString()}
                </p>
              </div>
              <Icons.receipt className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="material-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  ${getOverdueInvoices().reduce((sum, inv) => sum + parseFloat(inv.amount), 0).toLocaleString()}
                </p>
              </div>
              <Icons.alert className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="material-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <Icons.receipt className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="material-card mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Invoice List</h3>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {isCreating && (
        <Card className="material-card mb-8">
          <CardHeader>
            <CardTitle>Create New Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="e.g., John Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Email *
                  </label>
                  <Input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="client@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Music production services, consulting, etc."
                  className="min-h-[100px]"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInvoiceMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))
        ) : filteredInvoices.length === 0 ? (
          <Card className="material-card">
            <CardContent className="p-12 text-center">
              <Icons.receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filterStatus !== "all" ? `No ${filterStatus} invoices` : "No invoices yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {filterStatus !== "all" 
                  ? `You don't have any ${filterStatus} invoices at the moment.`
                  : "Create your first invoice to start tracking your income and payments."
                }
              </p>
              {filterStatus === "all" && (
                <Button onClick={() => setIsCreating(true)}>
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="material-card hover:material-card-elevated transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invoice.clientName}
                        </h3>
                        <p className="text-sm text-gray-600">{invoice.clientEmail}</p>
                      </div>
                      <Badge 
                        className={`${statusColors[invoice.status as keyof typeof statusColors]} ${
                          isOverdue(invoice) ? "bg-red-100 text-red-800" : ""
                        }`}
                      >
                        {isOverdue(invoice) ? "overdue" : invoice.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {invoice.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center font-semibold text-green-600">
                        <Icons.dollar className="h-4 w-4 mr-1" />
                        ${parseFloat(invoice.amount).toLocaleString()}
                      </span>
                      
                      {invoice.dueDate && (
                        <span className={`flex items-center ${
                          isOverdue(invoice) ? "text-red-600 font-medium" : ""
                        }`}>
                          <Icons.calendar className="h-4 w-4 mr-1" />
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      
                      {invoice.paidDate && (
                        <span className="flex items-center text-green-600">
                          <Icons.receipt className="h-4 w-4 mr-1" />
                          Paid: {new Date(invoice.paidDate).toLocaleDateString()}
                        </span>
                      )}
                      
                      <span className="flex items-center">
                        <Icons.calendar className="h-4 w-4 mr-1" />
                        Created: {new Date(invoice.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 lg:w-auto">
                    <select
                      value={invoice.status}
                      onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={updateInvoiceMutation.isPending}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                    </select>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Icons.email className="h-3 w-3 mr-1" />
                        Send
                      </Button>
                      <Button size="sm" variant="outline">
                        PDF
                      </Button>
                      <Button size="sm" variant="outline">
                        <Icons.more className="h-3 w-3" />
                      </Button>
                    </div>
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
