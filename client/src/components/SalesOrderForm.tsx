import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, RotateCcw, Save, Loader2, AlertTriangle, Share2, Printer } from "lucide-react";
import { SalesLineItemRow, type SalesLineItemData } from "./SalesLineItemRow";
import type { Customer, Item } from "@shared/schema";

interface StockBalance {
  itemName: string;
  balance: number;
}

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
  const customerSelectRef = useRef<HTMLButtonElement>(null);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string>("");

  useEffect(() => {
    setTimeout(() => customerSelectRef.current?.focus(), 100);
  }, []);

  // Fetch next invoice number on mount
  const { data: nextInvoiceData } = useQuery<{ invoiceNumber: string }>({
    queryKey: ["/api/sales-orders/next-invoice-number"],
  });

  // Fetch stock balance to show available qty in item dropdown
  const { data: stockBalance = [] } = useQuery<StockBalance[]>({
    queryKey: ["/api/reports/stock-balance"],
  });

  // Create a map of item name to available quantity
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    stockBalance.forEach((s) => map.set(s.itemName, s.balance));
    return map;
  }, [stockBalance]);

  // Set invoice number when data is fetched
  useEffect(() => {
    if (nextInvoiceData?.invoiceNumber && !invoiceNumber) {
      setInvoiceNumber(nextInvoiceData.invoiceNumber);
    }
  }, [nextInvoiceData]);
  const [lineItems, setLineItems] = useState<SalesLineItemData[]>([
    { id: generateItemId(), itemName: "", quantity: 0, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
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

  // Fetch customer balance when a customer is selected
  const { data: customerBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/customers", customerId, "balance"],
    enabled: !!customerId,
  });

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

  // Check if any line item exceeds available stock
  const stockExceeded = useMemo(() => {
    return lineItems.some((li) => {
      if (!li.itemName || li.quantity <= 0) return false;
      const available = stockMap.get(li.itemName) ?? 0;
      return li.quantity > available;
    });
  }, [lineItems, stockMap]);

  const canSubmit = useMemo(() => {
    if (creditLimitInfo.exceeded && !isAdmin) {
      return false;
    }
    if (stockExceeded) {
      return false;
    }
    return true;
  }, [creditLimitInfo.exceeded, isAdmin, stockExceeded]);

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
      { id: generateItemId(), itemName: "", quantity: 0, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
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
      { id: generateItemId(), itemName: "", quantity: 0, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
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
                <SearchableSelect
                  options={customers.map((customer) => ({
                    value: customer.id.toString(),
                    label: customer.name,
                  }))}
                  value={customerId}
                  onValueChange={setCustomerId}
                  placeholder="Select customer"
                  searchPlaceholder="Type to search customers..."
                  emptyText="No customers found."
                  className="flex-1"
                  data-testid="select-customer"
                />
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
            <Label>Items</Label>
            
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
                    stockMap={stockMap}
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

          <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-md border border-gray-400 dark:border-gray-600">
            <div className="flex justify-end">
              <div className="text-right space-y-1">
                <Label className="text-xs text-muted-foreground">Total (KWD)</Label>
                <p className="text-2xl font-semibold font-mono" data-testid="text-sales-total-kwd">
                  {totalKwd} KWD
                </p>
              </div>
            </div>
          </div>

          {stockExceeded && (
            <Alert variant="destructive" data-testid="alert-stock-exceeded">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Quantity exceeds available stock. Please reduce the quantity or select a different item.
              </AlertDescription>
            </Alert>
          )}

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
                    `<div class="item-row"><div class="item-name">${li.itemName}</div><div class="item-details">${li.quantity} x ${li.priceKwd} = ${li.totalKwd}</div></div>`
                  ).join("");
                  const prevBal = customerBalance?.balance || 0;
                  const invAmt = parseFloat(totalKwd) || 0;
                  const currBal = prevBal + invAmt;
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Sales Invoice</title>
                      <style>
                        @page { size: 80mm auto; margin: 0; }
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        html, body { height: auto; min-height: 0; }
                        body { font-family: 'Courier New', monospace; font-size: 10pt; width: 80mm; line-height: 1.3; }
                        .receipt { width: 80mm; padding: 2mm 3mm; }
                        .header { text-align: center; padding-bottom: 2mm; border-bottom: 1px dashed #000; margin-bottom: 2mm; }
                        .company-name { font-size: 12pt; font-weight: bold; }
                        .company-sub { font-size: 8pt; }
                        .doc-type { font-size: 10pt; font-weight: bold; margin-top: 1mm; }
                        .info { margin-bottom: 2mm; font-size: 9pt; }
                        .info-row { display: flex; justify-content: space-between; padding: 1mm 0; }
                        .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2mm 0; margin: 2mm 0; }
                        .item-row { margin-bottom: 2mm; font-size: 9pt; }
                        .item-name { font-weight: bold; }
                        .item-details { text-align: right; }
                        .balance-section { font-size: 8pt; margin: 2mm 0; padding: 2mm 0; border-bottom: 1px dashed #000; }
                        .balance-row { display: flex; justify-content: space-between; padding: 0.5mm 0; }
                        .total-box { text-align: center; padding: 2mm; margin: 2mm 0; background: #000; color: #fff; }
                        .total-label { font-size: 8pt; }
                        .total-value { font-size: 14pt; font-weight: bold; }
                        .footer { text-align: center; padding-top: 2mm; font-size: 8pt; }
                        @media print { html, body { height: auto; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                      </style>
                    </head>
                    <body>
                      <div class="receipt">
                        <div class="header">
                          <div class="company-name">Iqbal Electronics Co.</div>
                          <div class="company-sub">WLL</div>
                          <div class="doc-type">Sales Invoice</div>
                        </div>
                        <div class="info">
                          <div class="info-row"><span>Date:</span><span>${saleDate}</span></div>
                          <div class="info-row"><span>Invoice:</span><span style="font-weight:bold">${invoiceNumber || "N/A"}</span></div>
                          <div class="info-row"><span>Customer:</span><span>${customerName}</span></div>
                        </div>
                        <div class="items">${itemRows}</div>
                        ${customerId ? `<div class="balance-section"><div class="balance-row"><span>Previous Balance:</span><span>${prevBal.toFixed(3)} KWD</span></div><div class="balance-row"><span>Invoice Amount:</span><span>${invAmt.toFixed(3)} KWD</span></div></div>` : ''}
                        <div class="total-box">
                          <div class="total-label">${customerId ? 'Current Balance' : 'Total Amount'}</div>
                          <div class="total-value">${customerId ? currBal.toFixed(3) : totalKwd} KWD</div>
                        </div>
                        <div class="footer">Thank You!</div>
                      </div>
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
