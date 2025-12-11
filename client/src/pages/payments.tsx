import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Save, 
  CreditCard,
  Banknote,
  Search,
  Eye,
  Calendar,
  User,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Printer,
} from "lucide-react";
import type { PaymentWithDetails, Customer, Supplier, PaymentType, PaymentDirection } from "@shared/schema";
import { PAYMENT_TYPES, PAYMENT_DIRECTIONS } from "@shared/schema";

const PAGE_SIZE = 50;

export default function PaymentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentWithDetails | null>(null);
  const [page, setPage] = useState(1);
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };
  
  const handlePaymentTypeFilterChange = (value: string) => {
    setPaymentTypeFilter(value);
    setPage(1);
  };
  
  const handleDirectionFilterChange = (value: string) => {
    setDirectionFilter(value);
    setPage(1);
  };
  
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [direction, setDirection] = useState<PaymentDirection>("IN");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ data: PaymentWithDetails[]; total: number }>({
    queryKey: ["/api/payments", { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }],
  });
  
  const payments = paymentsData?.data ?? [];
  const totalPayments = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(totalPayments / PAGE_SIZE);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      paymentDate: string;
      direction: string;
      customerId: number | null;
      supplierId: number | null;
      paymentType: string;
      amount: string;
      reference: string | null;
      notes: string | null;
    }) => {
      const response = await apiRequest("POST", "/api/payments", data);
      return response.json();
    },
    onSuccess: async (savedPayment: PaymentWithDetails) => {
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/payments" });
      await queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === "/api/payments" });
      setPage(1);
      toast({ title: "Payment recorded successfully" });
      resetForm();
      setShowForm(false);
      // Auto-print the receipt immediately
      handlePrintPayment(savedPayment);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record payment", description: error.message, variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/payments" });
      toast({ title: "Payment deleted successfully" });
      setPaymentToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete payment", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setDirection("IN");
    setCustomerId("");
    setSupplierId("");
    setPaymentType("Cash");
    setAmount("");
    setReference("");
    setNotes("");
  };

  const handlePrintPayment = (payment: PaymentWithDetails) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const partyName = payment.direction === "IN" 
      ? payment.customer?.name || "Not specified"
      : payment.supplier?.name || "Not specified";
    const partyLabel = payment.direction === "IN" ? "Received From" : "Paid To";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Courier New', monospace;
              background: #fff;
              color: #000;
              line-height: 1.3;
              font-size: 10pt;
              width: 80mm;
              margin: 0;
              padding: 0;
            }
            
            .receipt {
              width: 80mm;
              padding: 2mm 3mm;
            }
            
            .header {
              text-align: center;
              padding-bottom: 2mm;
              border-bottom: 1px dashed #000;
              margin-bottom: 2mm;
            }
            
            .company-name {
              font-size: 12pt;
              font-weight: bold;
            }
            
            .company-sub {
              font-size: 8pt;
            }
            
            .badge {
              display: inline-block;
              margin-top: 2mm;
              padding: 1mm 3mm;
              font-size: 9pt;
              font-weight: bold;
              border: 1px solid #000;
            }
            
            .details {
              margin-bottom: 2mm;
            }
            
            .row {
              display: flex;
              justify-content: space-between;
              padding: 1mm 0;
              font-size: 9pt;
            }
            
            .row-label {
              color: #333;
            }
            
            .row-value {
              font-weight: bold;
              text-align: right;
            }
            
            .amount-box {
              text-align: center;
              padding: 3mm 0;
              margin: 2mm 0;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
            }
            
            .amount-label {
              font-size: 8pt;
              text-transform: uppercase;
            }
            
            .amount-value {
              font-size: 16pt;
              font-weight: bold;
            }
            
            .notes {
              font-size: 8pt;
              padding: 2mm;
              background: #f0f0f0;
              margin-bottom: 2mm;
            }
            
            .footer {
              text-align: center;
              padding-top: 2mm;
              border-top: 1px dashed #000;
              font-size: 8pt;
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="company-name">Iqbal Electronics</div>
              <div class="company-sub">Co. WLL - Kuwait</div>
              <div class="badge">${payment.direction === "IN" ? "PAYMENT IN" : "PAYMENT OUT"}</div>
            </div>
            
            <div class="details">
              <div class="row">
                <span class="row-label">Date:</span>
                <span class="row-value">${formatDate(payment.paymentDate)}</span>
              </div>
              <div class="row">
                <span class="row-label">${partyLabel}:</span>
                <span class="row-value">${partyName}</span>
              </div>
              <div class="row">
                <span class="row-label">Method:</span>
                <span class="row-value">${payment.paymentType}</span>
              </div>
              ${payment.reference ? `
              <div class="row">
                <span class="row-label">Ref:</span>
                <span class="row-value">${payment.reference}</span>
              </div>
              ` : ""}
            </div>
            
            <div class="amount-box">
              <div class="amount-label">Amount ${payment.direction === "IN" ? "Received" : "Paid"}</div>
              <div class="amount-value">${payment.direction === "OUT" ? "-" : ""}${parseFloat(payment.amount).toFixed(3)} KWD</div>
            </div>
            
            ${payment.notes ? `<div class="notes">Notes: ${payment.notes}</div>` : ""}
            
            <div class="footer">
              Thank You!<br/>
              Computer Generated Receipt
            </div>
          </div>
          
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (direction === "IN" && !customerId) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }

    createPaymentMutation.mutate({
      paymentDate,
      direction,
      customerId: direction === "IN" && customerId ? parseInt(customerId) : null,
      supplierId: direction === "OUT" && supplierId ? parseInt(supplierId) : null,
      paymentType,
      amount,
      reference: null,
      notes: notes || null,
    });
  };

  const filteredPayments = payments.filter((payment) => {
    const partyName = payment.direction === "IN" 
      ? payment.customer?.name 
      : payment.supplier?.name;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      (partyName?.toLowerCase() ?? "").includes(searchLower) ||
      (payment.reference?.toLowerCase() ?? "").includes(searchLower) ||
      payment.paymentType.toLowerCase().includes(searchLower);
    
    const matchesType = paymentTypeFilter === "all" || payment.paymentType === paymentTypeFilter;
    const matchesDirection = directionFilter === "all" || payment.direction === directionFilter;
    
    return matchesSearch && matchesType && matchesDirection;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "Cash":
        return "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200";
      case "NBK Bank":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "CBK Bank":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Knet":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "Wamd":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      default:
        return "";
    }
  };

  const getDirectionBadge = (dir: string) => {
    if (dir === "IN") {
      return (
        <Badge variant="secondary" className="bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
          <ArrowDownLeft className="h-3 w-3 mr-1" />
          IN
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <ArrowUpRight className="h-3 w-3 mr-1" />
        OUT
      </Badge>
    );
  };

  const totalIn = filteredPayments
    .filter(p => p.direction === "IN")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  
  const totalOut = filteredPayments
    .filter(p => p.direction === "OUT")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (paymentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-payments">
            Payment Register
          </h2>
          <p className="text-sm text-muted-foreground">
            Record and track payments (received and paid)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-new-payment">
          <Plus className="h-4 w-4 mr-2" />
          New Payment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer/supplier, reference..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-search-payments"
              />
            </div>
            <Select value={directionFilter} onValueChange={handleDirectionFilterChange}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-direction">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="IN">Payment IN</SelectItem>
                <SelectItem value="OUT">Payment OUT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentTypeFilter} onValueChange={handlePaymentTypeFilterChange}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-payment-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments found</p>
              <p className="text-sm">Click "New Payment" to record a payment</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-left py-3 px-2 font-medium">Direction</th>
                      <th className="text-left py-3 px-2 font-medium">Customer/Supplier</th>
                      <th className="text-left py-3 px-2 font-medium">Type</th>
                      <th className="text-right py-3 px-2 font-medium">Amount (KWD)</th>
                      <th className="text-left py-3 px-2 font-medium">Reference</th>
                      <th className="text-center py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr 
                        key={payment.id} 
                        className="border-b hover-elevate"
                        data-testid={`row-payment-${payment.id}`}
                      >
                        <td className="py-3 px-2">
                          <span className="font-mono text-xs">
                            {formatDate(payment.paymentDate)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {getDirectionBadge(payment.direction)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {payment.direction === "IN" ? (
                              <>
                                <User className="h-4 w-4 text-muted-foreground" />
                                {payment.customer?.name || "-"}
                              </>
                            ) : (
                              <>
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {payment.supplier?.name || "-"}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getPaymentTypeColor(payment.paymentType)}`}
                          >
                            {payment.paymentType}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          {parseFloat(payment.amount).toFixed(3)}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">
                          {payment.reference || "-"}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelectedPayment(payment)}
                              data-testid={`button-view-payment-${payment.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setPaymentToDelete(payment)}
                                data-testid={`button-delete-payment-${payment.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50">
                      <td colSpan={4} className="py-3 px-2 font-medium">
                        Summary ({filteredPayments.length} payments)
                      </td>
                      <td colSpan={3} className="py-3 px-2">
                        <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                            <span className="text-muted-foreground">IN:</span>
                            <span className="font-mono font-bold text-emerald-600">{totalIn.toFixed(3)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                            <span className="text-muted-foreground">OUT:</span>
                            <span className="font-mono font-bold text-red-600">{totalOut.toFixed(3)}</span>
                          </div>
                          <div className="border-l pl-4 flex items-center gap-2">
                            <span className="text-muted-foreground">Net:</span>
                            <span className={`font-mono font-bold ${totalIn - totalOut >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {(totalIn - totalOut).toFixed(3)} KWD
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, totalPayments)} of {totalPayments} payments
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-4">
                <span className={`font-medium ${direction === "IN" ? "text-emerald-600" : "text-muted-foreground"}`}>
                  Payment IN
                </span>
                <Switch
                  checked={direction === "OUT"}
                  onCheckedChange={(checked) => {
                    setDirection(checked ? "OUT" : "IN");
                    setCustomerId("");
                    setSupplierId("");
                  }}
                  data-testid="switch-payment-direction"
                />
                <span className={`font-medium ${direction === "OUT" ? "text-red-600" : "text-muted-foreground"}`}>
                  Payment OUT
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  data-testid="input-payment-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentType">Payment Type</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                  <SelectTrigger data-testid="select-payment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {direction === "IN" ? (
              <div className="space-y-2">
                <Label htmlFor="customer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger data-testid="select-payment-customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="supplier" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Supplier (Paid to)
                </Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger data-testid="select-payment-supplier">
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No supplier --</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KWD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000"
                required
                data-testid="input-payment-amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                data-testid="input-payment-notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPaymentMutation.isPending} data-testid="button-save-payment">
                {createPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedPayment.paymentDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direction</p>
                  <div className="mt-1">{getDirectionBadge(selectedPayment.direction)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPayment.direction === "IN" ? "Customer" : "Supplier"}
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    {selectedPayment.direction === "IN" ? (
                      <>
                        <User className="h-4 w-4" />
                        {selectedPayment.customer?.name || "Not specified"}
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4" />
                        {selectedPayment.supplier?.name || "Not specified"}
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge className={`mt-1 ${getPaymentTypeColor(selectedPayment.paymentType)}`}>
                    {selectedPayment.paymentType}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className={`text-2xl font-bold font-mono flex items-center gap-2 ${selectedPayment.direction === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                  <Banknote className="h-6 w-6" />
                  {selectedPayment.direction === "OUT" ? "-" : "+"}{parseFloat(selectedPayment.amount).toFixed(3)} KWD
                </p>
              </div>
              
              {selectedPayment.reference && (
                <div>
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="font-mono text-sm">{selectedPayment.reference}</p>
                </div>
              )}
              
              {selectedPayment.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => selectedPayment && handlePrintPayment(selectedPayment)}
              data-testid="button-print-payment"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => setSelectedPayment(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {paymentToDelete?.direction === "IN" ? "incoming" : "outgoing"} payment of{" "}
              <strong>{paymentToDelete ? parseFloat(paymentToDelete.amount).toFixed(3) : 0} KWD</strong>
              {paymentToDelete?.direction === "IN" && paymentToDelete?.customer 
                ? ` from ${paymentToDelete.customer.name}` 
                : paymentToDelete?.direction === "OUT" && paymentToDelete?.supplier
                  ? ` to ${paymentToDelete.supplier.name}`
                  : ""}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-payment"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
