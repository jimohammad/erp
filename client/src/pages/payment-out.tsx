import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import companyLogoUrl from "@/assets/company-logo.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Trash2, 
  Loader2, 
  Save, 
  Search,
  Eye,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Printer,
} from "lucide-react";
import type { PaymentWithDetails, Supplier, PaymentType, PurchaseOrderWithDetails } from "@shared/schema";
import { PAYMENT_TYPES } from "@shared/schema";

const FX_CURRENCIES = ["AED", "USD"] as const;
const PAGE_SIZE = 50;

export default function PaymentOutPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_user";
  
  const [logoBase64, setLogoBase64] = useState<string>("");
  
  useEffect(() => {
    fetch(companyLogoUrl)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(console.error);
  }, []);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
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
  
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [shouldPrintAfterSave, setShouldPrintAfterSave] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash");
  const [amount, setAmount] = useState("");
  const [showFxFields, setShowFxFields] = useState(false);
  const [fxCurrency, setFxCurrency] = useState<string>("");
  const [fxRate, setFxRate] = useState("");
  const [fxAmount, setFxAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ data: PaymentWithDetails[]; total: number }>({
    queryKey: ["/api/payments", "OUT", page],
    queryFn: async () => {
      const res = await fetch(`/api/payments?direction=OUT&limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });
  
  const payments = paymentsData?.data ?? [];
  const totalPayments = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(totalPayments / PAGE_SIZE);

  const { data: allSuppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
  
  // Filter to only show suppliers (not customers or salesmen)
  const suppliers = allSuppliers.filter(s => s.partyType === "supplier" || !s.partyType);

  const { data: purchaseOrdersData } = useQuery<{ data: PurchaseOrderWithDetails[]; total: number }>({
    queryKey: ["/api/purchase-orders", "all"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders?limit=1000`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
      return res.json();
    },
  });

  const allPurchaseOrders = purchaseOrdersData?.data ?? [];
  
  const supplierPurchaseOrders = supplierId 
    ? allPurchaseOrders.filter(po => po.supplierId === parseInt(supplierId))
    : [];

  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      paymentDate: string;
      direction: string;
      customerId: number | null;
      supplierId: number | null;
      purchaseOrderId: number | null;
      paymentType: string;
      amount: string;
      fxCurrency: string | null;
      fxRate: string | null;
      fxAmount: string | null;
      reference: string | null;
      notes: string | null;
    }) => {
      const response = await apiRequest("POST", "/api/payments", data);
      return response.json();
    },
    onSuccess: async (savedPayment: PaymentWithDetails) => {
      await queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/payments") });
      await queryClient.refetchQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/payments") });
      setPage(1);
      toast({ title: "Payment recorded successfully" });
      if (shouldPrintAfterSave) {
        handlePrintPayment(savedPayment);
      }
      resetForm();
      setShouldPrintAfterSave(false);
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
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/payments") });
      toast({ title: "Payment deleted successfully" });
      setPaymentToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete payment", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setSupplierId("");
    setPurchaseOrderId("");
    setPaymentType("Cash");
    setAmount("");
    setFxCurrency("");
    setFxRate("");
    setFxAmount("");
    setShowFxFields(false);
    setNotes("");
  };

  const handleFxAmountChange = (value: string) => {
    setFxAmount(value);
    if (fxRate && value) {
      const calculatedKwd = parseFloat(value) * parseFloat(fxRate);
      setAmount(calculatedKwd.toFixed(3));
    }
  };

  const handleFxRateChange = (value: string) => {
    setFxRate(value);
    if (fxAmount && value) {
      const calculatedKwd = parseFloat(fxAmount) * parseFloat(value);
      setAmount(calculatedKwd.toFixed(3));
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (!supplierId) {
      toast({ title: "Please select a supplier", variant: "destructive" });
      return;
    }

    createPaymentMutation.mutate({
      paymentDate,
      direction: "OUT",
      customerId: null,
      supplierId: parseInt(supplierId),
      purchaseOrderId: purchaseOrderId ? parseInt(purchaseOrderId) : null,
      paymentType,
      amount,
      fxCurrency: showFxFields && fxCurrency ? fxCurrency : null,
      fxRate: showFxFields && fxRate ? fxRate : null,
      fxAmount: showFxFields && fxAmount ? fxAmount : null,
      reference: null,
      notes: notes || null,
    });
  };

  const filteredPayments = payments.filter((payment) => {
    const partyName = payment.supplier?.name;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      (partyName?.toLowerCase() ?? "").includes(searchLower) ||
      (payment.reference?.toLowerCase() ?? "").includes(searchLower) ||
      payment.paymentType.toLowerCase().includes(searchLower);
    
    const matchesType = paymentTypeFilter === "all" || payment.paymentType === paymentTypeFilter;
    
    return matchesSearch && matchesType;
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

  const totalPaid = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                  'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];
    
    const [whole, decimal] = num.toFixed(3).split('.');
    const wholeNum = parseInt(whole);
    const fils = parseInt(decimal);
    
    const convertChunk = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
    };
    
    let words = '';
    let scaleIndex = 0;
    let n = wholeNum;
    
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        words = convertChunk(chunk) + ' ' + scales[scaleIndex] + ' ' + words;
      }
      n = Math.floor(n / 1000);
      scaleIndex++;
    }
    
    let result = words.trim() + ' Dinars';
    if (fils > 0) {
      result += ' and ' + convertChunk(fils) + ' Fils';
    }
    return result;
  };

  const handlePrintPayment = (payment: PaymentWithDetails) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const supplierName = payment.supplier?.name || "Supplier";
    const amountNum = parseFloat(payment.amount);
    const amountWords = numberToWords(amountNum);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Voucher</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 3mm;
            font-size: 12px;
          }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .logo { max-width: 50mm; max-height: 15mm; margin-bottom: 4px; }
          .company { font-size: 14px; font-weight: bold; }
          .title { font-size: 16px; font-weight: bold; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .label { font-weight: bold; }
          .amount-box { 
            border: 2px solid #000; 
            padding: 8px; 
            margin: 10px 0; 
            text-align: center;
            background: #f0f0f0;
          }
          .amount { font-size: 20px; font-weight: bold; }
          .words { font-size: 10px; font-style: italic; margin-top: 4px; }
          .fx-info { font-size: 11px; color: #666; margin-top: 4px; }
          .footer { text-align: center; border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
          <div class="company">Iqbal Electronics Co. WLL</div>
          <div class="title">PAYMENT VOUCHER</div>
        </div>
        <div class="row"><span class="label">Voucher No:</span><span>PV-${payment.id}</span></div>
        <div class="row"><span class="label">Date:</span><span>${formatDate(payment.paymentDate)}</span></div>
        <div class="row"><span class="label">Supplier:</span><span>${supplierName}</span></div>
        <div class="row"><span class="label">Payment Type:</span><span>${payment.paymentType}</span></div>
        <div class="amount-box">
          <div>Amount Paid</div>
          <div class="amount">${amountNum.toFixed(3)} KWD</div>
          <div class="words">${amountWords}</div>
          ${payment.fxCurrency ? `<div class="fx-info">(${payment.fxAmount} ${payment.fxCurrency} @ ${payment.fxRate})</div>` : ''}
        </div>
        ${payment.notes ? `<div class="row"><span class="label">Notes:</span><span>${payment.notes}</span></div>` : ''}
        <div class="footer">
          <p>Printed: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <ArrowUpRight className="h-6 w-6 text-red-600" />
          Payment OUT (Pay)
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Make Payment to Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setPurchaseOrderId(""); }}>
                  <SelectTrigger data-testid="select-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  data-testid="input-payment-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseOrder">Purchase Order (Optional)</Label>
                <Select value={purchaseOrderId || "none"} onValueChange={(v) => setPurchaseOrderId(v === "none" ? "" : v)} disabled={!supplierId}>
                  <SelectTrigger data-testid="select-purchase-order">
                    <SelectValue placeholder="Link to PO" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No PO</SelectItem>
                    {supplierPurchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id.toString()}>
                        {po.invoiceNumber || `PO-${po.id}`} - {po.totalKwd} KWD
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                <SelectTrigger data-testid="select-payment-type">
                  <SelectValue placeholder="Select type" />
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

            <div className="flex items-center space-x-2">
              <Switch
                id="fxToggle"
                checked={showFxFields}
                onCheckedChange={setShowFxFields}
              />
              <Label htmlFor="fxToggle">Foreign Currency Payment</Label>
            </div>

            {showFxFields && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="fxCurrency">Currency</Label>
                  <Select value={fxCurrency} onValueChange={setFxCurrency}>
                    <SelectTrigger data-testid="select-fx-currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {FX_CURRENCIES.map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fxRate">Exchange Rate (to KWD)</Label>
                  <Input
                    id="fxRate"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={fxRate}
                    onChange={(e) => handleFxRateChange(e.target.value)}
                    placeholder="0.0000"
                    data-testid="input-fx-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fxAmount">Amount in {fxCurrency || "FX"}</Label>
                  <Input
                    id="fxAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fxAmount}
                    onChange={(e) => handleFxAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="!text-3xl h-14 font-semibold placeholder:text-muted-foreground/30 placeholder:font-normal"
                    data-testid="input-fx-amount"
                  />
                </div>
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
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.000"
                required
                className="!text-3xl h-14 font-semibold placeholder:text-muted-foreground/30 placeholder:font-normal"
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

            <div className="flex justify-end gap-2">
              <Button 
                type="submit" 
                variant="outline"
                disabled={createPaymentMutation.isPending} 
                onClick={() => setShouldPrintAfterSave(false)}
                data-testid="button-save-payment"
              >
                {createPaymentMutation.isPending && !shouldPrintAfterSave ? (
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
              <Button 
                type="submit" 
                disabled={createPaymentMutation.isPending} 
                onClick={() => setShouldPrintAfterSave(true)}
                data-testid="button-save-print-payment"
              >
                {createPaymentMutation.isPending && shouldPrintAfterSave ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Save & Print
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by supplier, reference..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-search-payments"
              />
            </div>
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
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments made yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-left py-3 px-2 font-medium">Supplier</th>
                      <th className="text-left py-3 px-2 font-medium">Type</th>
                      <th className="text-right py-3 px-2 font-medium">FX Amount</th>
                      <th className="text-right py-3 px-2 font-medium">Amount (KWD)</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-b hover-elevate">
                        <td className="py-3 px-2">{formatDate(payment.paymentDate)}</td>
                        <td className="py-3 px-2">{payment.supplier?.name || "-"}</td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className={getPaymentTypeColor(payment.paymentType)}>
                            {payment.paymentType}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {payment.fxAmount && payment.fxCurrency 
                            ? `${parseFloat(payment.fxAmount).toFixed(2)} ${payment.fxCurrency}`
                            : "-"
                          }
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-red-600">
                          -{parseFloat(payment.amount).toFixed(3)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelectedPayment(payment)}
                              data-testid={`button-view-payment-${payment.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handlePrintPayment(payment)}
                              data-testid={`button-print-payment-${payment.id}`}
                            >
                              <Printer className="h-4 w-4" />
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
                    <tr className="border-t-2">
                      <td colSpan={4} className="py-3 px-2 font-bold">Total Paid</td>
                      <td className="py-3 px-2 text-right font-bold text-red-600">
                        -{totalPaid.toFixed(3)} KWD
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Payment made to supplier</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{formatDate(selectedPayment.paymentDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Supplier</Label>
                  <p className="font-medium">{selectedPayment.supplier?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Type</Label>
                  <p className="font-medium">{selectedPayment.paymentType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-medium text-red-600">-{parseFloat(selectedPayment.amount).toFixed(3)} KWD</p>
                </div>
                {selectedPayment.fxAmount && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">FX Amount</Label>
                      <p className="font-medium">{selectedPayment.fxAmount} {selectedPayment.fxCurrency}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Exchange Rate</Label>
                      <p className="font-medium">{selectedPayment.fxRate}</p>
                    </div>
                  </>
                )}
              </div>
              {selectedPayment.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p>{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>Close</Button>
            {selectedPayment && (
              <Button onClick={() => handlePrintPayment(selectedPayment)}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment of {paymentToDelete?.amount} KWD? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
