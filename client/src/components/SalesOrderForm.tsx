import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, RotateCcw, Save, Loader2, AlertTriangle, Share2, Printer } from "lucide-react";
import { SalesLineItemRow, type SalesLineItemData } from "./SalesLineItemRow";
import type { Customer, Item } from "@shared/schema";

interface SalesOrderFormProps {
  customers: Customer[];
  items: Item[];
  onSubmit: (data: SalesFormData) => Promise<void>;
  isSubmitting: boolean;
  isAdmin?: boolean;
}

export interface SalesFormData {
  saleDate: string;
  invoiceNumber: string;
  customerId: number | null;
  totalKwd: string;
  lineItems: SalesLineItemData[];
}

function generateItemId() {
  return Math.random().toString(36).substring(2, 9);
}

export function SalesOrderForm({
  customers,
  items,
  onSubmit,
  isSubmitting,
  isAdmin = false,
}: SalesOrderFormProps) {
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string>("");

  // Fetch next invoice number on mount
  const { data: nextInvoiceData } = useQuery<{ invoiceNumber: string }>({
    queryKey: ["/api/sales-orders/next-invoice-number"],
  });

  // Set invoice number when data is fetched
  useEffect(() => {
    if (nextInvoiceData?.invoiceNumber && !invoiceNumber) {
      setInvoiceNumber(nextInvoiceData.invoiceNumber);
    }
  }, [nextInvoiceData]);
  const [lineItems, setLineItems] = useState<SalesLineItemData[]>([
    { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
  ]);

  const [totalKwd, setTotalKwd] = useState("0.000");

  useEffect(() => {
    let total = 0;
    lineItems.forEach(item => {
      const qty = item.quantity || 0;
      const price = parseFloat(item.priceKwd) || 0;
      total += qty * price;
    });
    setTotalKwd(total.toFixed(3));
  }, [lineItems]);

  const selectedCustomer = useMemo(() => {
    if (!customerId) return null;
    return customers.find(c => c.id === parseInt(customerId)) || null;
  }, [customerId, customers]);

  const creditLimitInfo = useMemo(() => {
    if (!selectedCustomer) return { hasLimit: false, limit: 0, exceeded: false };
    
    const limit = selectedCustomer.creditLimit ? parseFloat(selectedCustomer.creditLimit) : 0;
    if (limit === 0) return { hasLimit: false, limit: 0, exceeded: false };
    
    const total = parseFloat(totalKwd) || 0;
    return {
      hasLimit: true,
      limit,
      exceeded: total > limit,
    };
  }, [selectedCustomer, totalKwd]);

  const canSubmit = useMemo(() => {
    if (creditLimitInfo.exceeded && !isAdmin) {
      return false;
    }
    return true;
  }, [creditLimitInfo.exceeded, isAdmin]);

  const handleLineItemChange = (id: string, field: keyof SalesLineItemData, value: string | number | string[]) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === "quantity" || field === "priceKwd") {
        const qty = field === "quantity" ? (value as number) : item.quantity;
        const price = field === "priceKwd" ? parseFloat(value as string) || 0 : parseFloat(item.priceKwd) || 0;
        updated.totalKwd = (qty * price).toFixed(3);
      }
      
      return updated;
    }));
  };

  const handleAddRow = () => {
    setLineItems(prev => [
      ...prev,
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = (refetchInvoiceNumber = false) => {
    setSaleDate(new Date().toISOString().split("T")[0]);
    setInvoiceNumber("");
    setCustomerId("");
    setLineItems([
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
    ]);
    if (refetchInvoiceNumber) {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders/next-invoice-number"] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) {
      return;
    }
    
    await onSubmit({
      saleDate,
      invoiceNumber,
      customerId: customerId ? parseInt(customerId) : null,
      totalKwd,
      lineItems,
    });

    handleReset(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">New Sales Invoice</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleReset()}
            data-testid="button-reset-sales"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customer">Customer</Label>
              <div className="flex gap-2">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="flex-1" data-testid="select-customer">
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
              {creditLimitInfo.hasLimit && (
                <p className="text-xs text-muted-foreground" data-testid="text-credit-limit-info">
                  Credit Limit: {creditLimitInfo.limit.toFixed(3)} KWD
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="saleDate">Date *</Label>
              <Input
                id="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                data-testid="input-sale-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                placeholder="e.g., INV-2024-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                data-testid="input-sales-invoice-number"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Line Items</Label>
            
            <div className="space-y-2">
              {lineItems.map((item, index) => {
                const allImeiNumbers = lineItems.flatMap(li => li.imeiNumbers);
                return (
                  <SalesLineItemRow
                    key={item.id}
                    item={item}
                    items={items}
                    index={index}
                    onChange={handleLineItemChange}
                    onRemove={handleRemoveRow}
                    canRemove={lineItems.length > 1}
                    allImeiNumbers={allImeiNumbers}
                  />
                );
              })}
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleAddRow}
              data-testid="button-add-sales-row"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
          </div>

          <div className="p-4 bg-muted/50 rounded-md">
            <div className="flex justify-end">
              <div className="text-right space-y-1">
                <Label className="text-xs text-muted-foreground">Total (KWD)</Label>
                <p className="text-xl font-semibold font-mono" data-testid="text-sales-total-kwd">
                  {totalKwd} KWD
                </p>
              </div>
            </div>
          </div>

          {creditLimitInfo.exceeded && (
            <Alert variant="destructive" data-testid="alert-credit-limit-exceeded">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isAdmin ? (
                  <>
                    <span className="font-medium">Warning:</span> Invoice total ({totalKwd} KWD) exceeds customer credit limit ({creditLimitInfo.limit.toFixed(3)} KWD). 
                    As admin, you can still save this invoice.
                  </>
                ) : (
                  <>
                    <span className="font-medium">Cannot save invoice:</span> Total ({totalKwd} KWD) exceeds customer credit limit ({creditLimitInfo.limit.toFixed(3)} KWD). 
                    Please contact admin for approval.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                const customerName = selectedCustomer?.name || "Customer";
                const items = lineItems.filter(li => li.itemName).map(li => 
                  `${li.itemName} x${li.quantity} @ ${li.priceKwd} KWD = ${li.totalKwd} KWD`
                ).join("\n");
                const message = encodeURIComponent(
                  `Sales Invoice\n` +
                  `Date: ${saleDate}\n` +
                  `Invoice: ${invoiceNumber || "N/A"}\n` +
                  `Customer: ${customerName}\n\n` +
                  `Items:\n${items}\n\n` +
                  `Total: ${totalKwd} KWD`
                );
                window.open(`https://wa.me/?text=${message}`, "_blank");
              }}
              data-testid="button-whatsapp-sales"
            >
              <Share2 className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  const customerName = selectedCustomer?.name || "Customer";
                  const itemRows = lineItems.filter(li => li.itemName).map(li => 
                    `<tr><td>${li.itemName}</td><td>${li.quantity}</td><td>${li.priceKwd}</td><td>${li.totalKwd}</td></tr>`
                  ).join("");
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Sales Invoice</title>
                      <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .company { font-size: 24px; font-weight: bold; }
                        .title { font-size: 18px; margin-top: 10px; }
                        .details { margin: 20px 0; }
                        .row { display: flex; justify-content: space-between; padding: 4px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f5f5f5; }
                        .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div class="company">Iqbal Electronics Co. WLL</div>
                        <div class="title">Sales Invoice</div>
                      </div>
                      <div class="details">
                        <div class="row"><span>Date:</span><span>${saleDate}</span></div>
                        <div class="row"><span>Invoice:</span><span>${invoiceNumber || "N/A"}</span></div>
                        <div class="row"><span>Customer:</span><span>${customerName}</span></div>
                      </div>
                      <table>
                        <thead><tr><th>Item</th><th>Qty</th><th>Price (KWD)</th><th>Total (KWD)</th></tr></thead>
                        <tbody>${itemRows}</tbody>
                      </table>
                      <div class="total">Total: ${totalKwd} KWD</div>
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
              data-testid="button-print-sales"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !canSubmit}
              data-testid="button-submit-sales"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
