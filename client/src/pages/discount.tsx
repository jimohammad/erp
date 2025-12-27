import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Percent, Save, Share2, Printer, Trash2 } from "lucide-react";
import type { Customer, DiscountWithDetails } from "@shared/schema";
import { format } from "date-fns";

interface Invoice {
  id: number;
  invoiceNumber: string;
  totalKwd: string;
  outstandingBalance: string;
}

interface InvoiceBalance {
  invoiceTotal: number;
  paidAmount: number;
  discountAmount: number;
  returnAmount: number;
  outstandingBalance: number;
}

export default function DiscountPage() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [customerId, setCustomerId] = useState<string>("");
  const [salesOrderId, setSalesOrderId] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [savedDiscount, setSavedDiscount] = useState<DiscountWithDetails | null>(null);
  const [shouldPrintAfterSave, setShouldPrintAfterSave] = useState(false);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: discounts = [], isLoading: discountsLoading } = useQuery<DiscountWithDetails[]>({
    queryKey: ["/api/discounts"],
  });

  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices-for-customer", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const response = await fetch(`/api/invoices-for-customer/${customerId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
  });

  const { data: invoiceBalance } = useQuery<InvoiceBalance>({
    queryKey: [`/api/invoice-balance/${salesOrderId}`],
    enabled: !!salesOrderId,
  });

  const selectedInvoice = invoices.find(inv => inv.id.toString() === salesOrderId);
  
  // Calculate if discount exceeds outstanding balance
  const discountValue = parseFloat(discountAmount) || 0;
  const outstandingBalance = invoiceBalance?.outstandingBalance || 0;
  const exceedsBalance = discountValue > outstandingBalance && outstandingBalance > 0;

  const createDiscountMutation = useMutation({
    mutationFn: async (data: { customerId: number; salesOrderId: number; discountAmount: string; notes?: string }) => {
      return await apiRequest<DiscountWithDetails>("POST", "/api/discounts", data);
    },
    onSuccess: (discount: DiscountWithDetails) => {
      // Invalidate all related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices-for-customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-statement"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/balances/all"] });
      if (discount.customerId) {
        queryClient.invalidateQueries({ queryKey: ["/api/customers", discount.customerId.toString(), "balance"] });
      }
      setSavedDiscount(discount);
      toast({
        title: "Discount Saved",
        description: "Discount has been saved successfully.",
      });
      if (shouldPrintAfterSave) {
        printDiscountReceipt(discount);
        setShouldPrintAfterSave(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save discount",
        variant: "destructive",
      });
    },
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/discounts/${id}`);
    },
    onSuccess: () => {
      // Invalidate all related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices-for-customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-statement"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/balances/all"] });
      toast({
        title: "Discount Deleted",
        description: "Discount has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete discount",
        variant: "destructive",
      });
    },
  });

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);
    setSalesOrderId("");
    setSavedDiscount(null);
  };

  const handleWhatsApp = () => {
    if (!savedDiscount) {
      toast({
        title: "Save First",
        description: "Please save the discount before sharing",
        variant: "destructive",
      });
      return;
    }

    const customerName = savedDiscount.customer?.name || "Customer";
    const invoiceNum = savedDiscount.salesOrder?.invoiceNumber || `INV-${savedDiscount.salesOrderId}`;
    const amount = savedDiscount.discountAmount;

    const message = encodeURIComponent(
      `Discount Details:\n` +
      `Customer: ${customerName}\n` +
      `Invoice: ${invoiceNum}\n` +
      `Discount Amount: ${amount} KWD\n` +
      `Date: ${format(new Date(), "dd/MM/yyyy")}`
    );

    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const printDiscountReceipt = (discount: DiscountWithDetails) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const customerName = discount.customer?.name || "Customer";
      const invoiceNum = discount.salesOrder?.invoiceNumber || `INV-${discount.salesOrderId}`;
      const amount = discount.discountAmount;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Discount Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .company { font-size: 24px; font-weight: bold; }
            .title { font-size: 18px; margin-top: 10px; }
            .details { margin-top: 20px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .label { font-weight: bold; }
            .amount { font-size: 20px; color: #16a34a; font-weight: bold; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">Iqbal Electronics Co. WLL</div>
            <div class="title">Discount Receipt</div>
          </div>
          <div class="details">
            <div class="row">
              <span class="label">Date:</span>
              <span>${format(new Date(), "dd/MM/yyyy")}</span>
            </div>
            <div class="row">
              <span class="label">Customer:</span>
              <span>${customerName}</span>
            </div>
            <div class="row">
              <span class="label">Invoice Number:</span>
              <span>${invoiceNum}</span>
            </div>
          </div>
          <div class="amount">
            Discount: ${amount} KWD
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePrint = () => {
    if (!savedDiscount) {
      toast({
        title: "Save First",
        description: "Please save the discount before printing",
        variant: "destructive",
      });
      return;
    }
    printDiscountReceipt(savedDiscount);
  };

  const validateAndSave = (print: boolean) => {
    if (!customerId || !salesOrderId || !discountAmount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return false;
    }
    
    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid discount amount",
        variant: "destructive",
      });
      return false;
    }
    
    if (invoiceBalance && amount > invoiceBalance.outstandingBalance) {
      toast({
        title: "Validation Error",
        description: `Discount amount cannot exceed outstanding balance (${invoiceBalance.outstandingBalance.toFixed(3)} KWD)`,
        variant: "destructive",
      });
      return false;
    }

    setShouldPrintAfterSave(print);
    createDiscountMutation.mutate({
      customerId: parseInt(customerId),
      salesOrderId: parseInt(salesOrderId),
      discountAmount,
      notes: notes || undefined,
    });
    return true;
  };

  const handleSaveAndPrint = () => {
    validateAndSave(true);
  };

  const handleSave = () => {
    validateAndSave(false);
  };

  const handleClear = () => {
    setCustomerId("");
    setSalesOrderId("");
    setDiscountAmount("");
    setNotes("");
    setSavedDiscount(null);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Percent className="h-6 w-6" />
          Discount
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Discount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select value={customerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger data-testid="select-customer">
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

              <div className="space-y-2">
                <Label htmlFor="invoice">Invoice Number</Label>
                <Select 
                  value={salesOrderId} 
                  onValueChange={setSalesOrderId}
                  disabled={!customerId || invoicesLoading || invoices.length === 0}
                >
                  <SelectTrigger data-testid="select-invoice">
                    <SelectValue placeholder={
                      !customerId 
                        ? "Select customer first" 
                        : invoicesLoading 
                          ? "Loading invoices..." 
                          : invoices.length === 0 
                            ? "No invoices found for this customer" 
                            : "Select invoice"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id.toString()}>
                        {invoice.invoiceNumber} - {invoice.totalKwd} KWD
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {invoicesError && (
                  <p className="text-sm text-destructive">Failed to load invoices. Please try again.</p>
                )}
              </div>
            </div>

            {selectedInvoice && invoiceBalance && (
              <div className="p-3 rounded-md bg-muted/50 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Total:</span>
                  <span className="font-medium">{invoiceBalance.invoiceTotal.toFixed(3)} KWD</span>
                </div>
                {invoiceBalance.paidAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Paid:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">-{invoiceBalance.paidAmount.toFixed(3)} KWD</span>
                  </div>
                )}
                {invoiceBalance.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Previous Discounts:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">-{invoiceBalance.discountAmount.toFixed(3)} KWD</span>
                  </div>
                )}
                {invoiceBalance.returnAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Returns:</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">-{invoiceBalance.returnAmount.toFixed(3)} KWD</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Outstanding Balance:</span>
                  <span className="font-bold text-lg">{invoiceBalance.outstandingBalance.toFixed(3)} KWD</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="discountAmount">Discount Amount (KWD)</Label>
              <Input
                id="discountAmount"
                type="number"
                step="0.001"
                min="0"
                max={outstandingBalance > 0 ? outstandingBalance : undefined}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="Enter discount amount"
                className={`!text-3xl h-14 font-semibold placeholder:text-muted-foreground/30 placeholder:font-normal ${exceedsBalance ? 'border-destructive' : ''}`}
                data-testid="input-discount-amount"
              />
              {exceedsBalance && (
                <p className="text-sm text-destructive">
                  Discount amount cannot exceed outstanding balance ({outstandingBalance.toFixed(3)} KWD)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any notes"
                data-testid="input-notes"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              <Button 
                variant="outline"
                onClick={handleSave} 
                disabled={createDiscountMutation.isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button 
                onClick={handleSaveAndPrint} 
                disabled={createDiscountMutation.isPending}
                data-testid="button-save-print"
              >
                <Printer className="h-4 w-4 mr-2" />
                Save & Print
              </Button>
              <Button 
                variant="outline" 
                onClick={handleWhatsApp}
                data-testid="button-whatsapp"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share WhatsApp
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePrint}
                disabled={!savedDiscount}
                data-testid="button-print"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleClear}
                data-testid="button-clear"
              >
                Clear
              </Button>
            </div>

            {savedDiscount && (
              <div className="p-4 rounded-md bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 mt-4">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Discount saved successfully!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Customer: {savedDiscount.customer?.name} | 
                  Invoice: {savedDiscount.salesOrder?.invoiceNumber || `INV-${savedDiscount.salesOrderId}`} | 
                  Amount: {savedDiscount.discountAmount} KWD
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Discounts</CardTitle>
          </CardHeader>
          <CardContent>
            {discountsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : discounts.length === 0 ? (
              <p className="text-muted-foreground">No discounts recorded yet</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {discounts.slice(0, 10).map((discount) => (
                  <div 
                    key={discount.id} 
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                    data-testid={`discount-item-${discount.id}`}
                  >
                    <div>
                      <p className="font-medium">{discount.customer?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {discount.salesOrder?.invoiceNumber || `INV-${discount.salesOrderId}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {discount.discountAmount} KWD
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteDiscountMutation.mutate(discount.id)}
                        disabled={deleteDiscountMutation.isPending}
                        data-testid={`button-delete-discount-${discount.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
