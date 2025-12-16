import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, RotateCcw, Save, Loader2, AlertTriangle, Share2, Printer, ChevronDown, FileText } from "lucide-react";
import { SalesLineItemRow, type SalesLineItemData } from "./SalesLineItemRow";
import type { Customer, Item, User } from "@shared/schema";
import companyLogoUrl from "@/assets/company-logo.jpg";

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
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
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
  // Only block if we have stock data AND the item exists in stock map
  const stockExceeded = useMemo(() => {
    if (stockBalance.length === 0) return false; // Don't block if stock data not loaded yet
    return lineItems.some((li) => {
      if (!li.itemName || li.quantity <= 0) return false;
      // Only check if the item exists in our stock data
      if (!stockMap.has(li.itemName)) return false;
      const available = stockMap.get(li.itemName) ?? 0;
      return li.quantity > available;
    });
  }, [lineItems, stockMap, stockBalance.length]);

  // Check if any line item has a price below the minimum selling price
  const pricesBelowMinimum = useMemo(() => {
    return lineItems.some((li) => {
      if (!li.itemName) return false;
      const itemData = items.find((itm) => itm.name === li.itemName);
      const minPrice = itemData?.sellingPriceKwd ? parseFloat(itemData.sellingPriceKwd) : 0;
      const currentPrice = parseFloat(li.priceKwd) || 0;
      return minPrice > 0 && currentPrice < minPrice;
    });
  }, [lineItems, items]);

  // Check if customer is selected
  const customerMissing = !customerId;

  // Check if there's at least one valid line item with quantity > 0
  const noValidLineItems = useMemo(() => {
    const validItems = lineItems.filter(li => li.itemName && li.quantity > 0);
    return validItems.length === 0;
  }, [lineItems]);

  const canSubmit = useMemo(() => {
    if (customerMissing) {
      return false;
    }
    if (noValidLineItems) {
      return false;
    }
    if (creditLimitInfo.exceeded && !isAdmin) {
      return false;
    }
    if (stockExceeded) {
      return false;
    }
    if (pricesBelowMinimum) {
      return false;
    }
    return true;
  }, [customerMissing, noValidLineItems, creditLimitInfo.exceeded, isAdmin, stockExceeded, pricesBelowMinimum]);

  // Get user's printer preference
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });
  
  const userPrinterType = userData?.printerType || "thermal";

  // Mutation to update printer preference
  const updatePrinterMutation = useMutation({
    mutationFn: async (printerType: string) => {
      return apiRequest("PUT", "/api/auth/user/printer-type", { printerType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // Thermal printer print function (80mm receipt)
  const printThermal = () => {
    const customerName = selectedCustomer?.name || "Walk-in Customer";
    const previousBalance = customerBalance?.balance || 0;
    const invoiceAmount = parseFloat(totalKwd) || 0;
    const currentBalance = previousBalance + invoiceAmount;
    
    const validItems = lineItems.filter(li => li.itemName && li.quantity > 0);
    
    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) return;
    
    const itemsHtml = validItems.map(li => `
      <tr>
        <td style="text-align:left;padding:2px 0;">${li.itemName}</td>
        <td style="text-align:center;padding:2px 0;">${li.quantity}</td>
        <td style="text-align:right;padding:2px 0;">${parseFloat(li.priceKwd || "0").toFixed(3)}</td>
        <td style="text-align:right;padding:2px 0;">${li.totalKwd}</td>
      </tr>
    `).join("");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            width: 80mm; 
            padding: 5mm;
            color: #000;
          }
          .header { text-align: center; margin-bottom: 10px; }
          .company { font-size: 14px; font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 11px; }
          .totals { margin-top: 10px; }
          .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .totals .total-row { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">Iqbal Electronics Co. WLL</div>
        </div>
        <div class="divider"></div>
        <div class="info-row"><span>Date:</span><span>${saleDate}</span></div>
        <div class="info-row"><span>Invoice:</span><span>${invoiceNumber || "N/A"}</span></div>
        <div class="info-row"><span>Customer:</span><span>${customerName}</span></div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Item</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Price</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="totals">
          <div class="row"><span>Previous Balance:</span><span>${previousBalance.toFixed(3)} KWD</span></div>
          <div class="row"><span>Invoice Amount:</span><span>${invoiceAmount.toFixed(3)} KWD</span></div>
          <div class="row total-row"><span>Current Balance:</span><span>${currentBalance.toFixed(3)} KWD</span></div>
        </div>
        <div class="divider"></div>
        <div class="footer">Thank You!</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // A4 Laser printer print function
  const printA4Laser = () => {
    const customerName = selectedCustomer?.name || "Walk-in Customer";
    const customerPhone = selectedCustomer?.phone || "";
    const customerAddress = "";
    const previousBalance = customerBalance?.balance || 0;
    const invoiceAmount = parseFloat(totalKwd) || 0;
    const currentBalance = previousBalance + invoiceAmount;
    
    const validItems = lineItems.filter(li => li.itemName && li.quantity > 0);
    
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;
    
    const itemsHtml = validItems.map((li, idx) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #ddd;">${li.itemName}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${li.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${parseFloat(li.priceKwd || "0").toFixed(3)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${li.totalKwd}</td>
      </tr>
    `).join("");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Credit Invoice ${invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
          .header { background: linear-gradient(135deg, #8B7CB3 0%, #6B5B95 100%); color: white; padding: 20px; display: flex; align-items: center; gap: 20px; }
          .logo { width: 80px; height: 80px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .company-info { flex: 1; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .company-details { font-size: 11px; opacity: 0.9; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 28px; margin-bottom: 5px; }
          .content { padding: 20px; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-box { background: #f8f8f8; padding: 15px; border-radius: 5px; width: 48%; }
          .info-box h3 { color: #6B5B95; margin-bottom: 10px; font-size: 14px; }
          .info-row { margin: 5px 0; }
          .info-label { font-weight: bold; display: inline-block; width: 100px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #6B5B95; color: white; padding: 10px; text-align: left; }
          .totals-section { display: flex; justify-content: flex-end; }
          .totals-box { width: 300px; background: #f8f8f8; padding: 15px; border-radius: 5px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .totals-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #6B5B95; padding-top: 10px; margin-top: 5px; color: #6B5B95; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : '<span style="color:#6B5B95;font-weight:bold;">LOGO</span>'}
          </div>
          <div class="company-info">
            <div class="company-name">Iqbal Electronics Co. WLL</div>
            <div class="company-details">Mobile Phones & Accessories | Electronics</div>
          </div>
          <div class="invoice-title">
            <h1>CREDIT INVOICE</h1>
            <div>${invoiceNumber || "N/A"}</div>
          </div>
        </div>
        <div class="content">
          <div class="info-section">
            <div class="info-box">
              <h3>Bill To</h3>
              <div class="info-row"><span class="info-label">Customer:</span> ${customerName}</div>
              ${customerPhone ? `<div class="info-row"><span class="info-label">Phone:</span> ${customerPhone}</div>` : ""}
              ${customerAddress ? `<div class="info-row"><span class="info-label">Address:</span> ${customerAddress}</div>` : ""}
            </div>
            <div class="info-box">
              <h3>Invoice Details</h3>
              <div class="info-row"><span class="info-label">Invoice No:</span> ${invoiceNumber || "N/A"}</div>
              <div class="info-row"><span class="info-label">Date:</span> ${saleDate}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:50px;text-align:center;">#</th>
                <th>Description</th>
                <th style="width:80px;text-align:center;">Qty</th>
                <th style="width:100px;text-align:right;">Unit Price</th>
                <th style="width:100px;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals-section">
            <div class="totals-box">
              <div class="totals-row"><span>Previous Balance:</span><span>${previousBalance.toFixed(3)} KWD</span></div>
              <div class="totals-row"><span>Invoice Amount:</span><span>${invoiceAmount.toFixed(3)} KWD</span></div>
              <div class="totals-row total"><span>Current Balance:</span><span>${currentBalance.toFixed(3)} KWD</span></div>
            </div>
          </div>
          <div class="footer">
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line">Customer Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Authorized Signature</div>
              </div>
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

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

  // Save and print functions - save invoice first, then print
  const handleSaveAndPrintThermal = async () => {
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
    
    // Print after saving
    printThermal();
    handleReset(true);
  };

  const handleSaveAndPrintA4 = async () => {
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
    
    // Print after saving
    printA4Laser();
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
              <Select value={customerId} onValueChange={setCustomerId}>
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
              {customerId && customerBalance !== undefined && (
                <p className={`text-sm font-medium ${(customerBalance?.balance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} data-testid="text-customer-balance">
                  Current Balance: {(customerBalance?.balance || 0).toFixed(3)} KWD
                  {(customerBalance?.balance || 0) > 0 && <span className="text-xs font-normal ml-1">(Amount Due)</span>}
                </p>
              )}
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

          {pricesBelowMinimum && (
            <Alert variant="destructive" data-testid="alert-price-below-minimum">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                One or more items have a price below the minimum selling price. Please adjust the prices to continue.
              </AlertDescription>
            </Alert>
          )}

          {customerMissing && (
            <Alert variant="destructive" data-testid="alert-customer-missing">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Customer required:</span> Please select a customer before saving the invoice.
              </AlertDescription>
            </Alert>
          )}

          {noValidLineItems && !customerMissing && (
            <Alert variant="destructive" data-testid="alert-no-items">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Items required:</span> Please add at least one item with quantity greater than 0.
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
            <div className="flex">
              <Button 
                type="button" 
                variant="outline" 
                disabled={!canSubmit || isSubmitting}
                onClick={() => {
                  if (userPrinterType === "a4laser") {
                    handleSaveAndPrintA4();
                  } else {
                    handleSaveAndPrintThermal();
                  }
                }}
                className="rounded-r-none border-r-0"
                data-testid="button-print-sales"
              >
                <Printer className="h-4 w-4 mr-2" />
                Save & Print ({userPrinterType === "a4laser" ? "A4" : "Thermal"})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" disabled={!canSubmit || isSubmitting} className="rounded-l-none px-2" data-testid="button-print-dropdown">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (userPrinterType !== "thermal") updatePrinterMutation.mutate("thermal");
                      handleSaveAndPrintThermal();
                    }}
                    disabled={!canSubmit || isSubmitting}
                    data-testid="menu-print-thermal"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Thermal (80mm)
                    {userPrinterType === "thermal" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (userPrinterType !== "a4laser") updatePrinterMutation.mutate("a4laser");
                      handleSaveAndPrintA4();
                    }}
                    disabled={!canSubmit || isSubmitting}
                    data-testid="menu-print-a4"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    A4 Laser
                    {userPrinterType === "a4laser" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
