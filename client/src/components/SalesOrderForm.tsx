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
import { generateQRCodeDataURL } from "@/lib/qrcode";

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
  salesmanId: number | null;
  totalKwd: string;
  lineItems: SalesLineItemData[];
}

interface Salesman {
  id: number;
  name: string;
  partyType: string;
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
  const [salesmanId, setSalesmanId] = useState<string>("");
  const [logoBase64, setLogoBase64] = useState<string>("");

  // Fetch salesmen for the dropdown
  const { data: salesmen = [] } = useQuery<Salesman[]>({
    queryKey: ["/api/suppliers"],
    select: (data) => data.filter((s: Salesman) => s.partyType === 'salesman'),
  });

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
    if (!selectedCustomer) return { hasLimit: false, limit: 0, exceeded: false, currentBalance: 0, newTotal: 0, available: 0 };
    
    const limit = selectedCustomer.creditLimit ? parseFloat(selectedCustomer.creditLimit) : 0;
    if (limit === 0) return { hasLimit: false, limit: 0, exceeded: false, currentBalance: 0, newTotal: 0, available: 0 };
    
    const currentBalance = customerBalance?.balance || 0;
    const saleAmount = parseFloat(totalKwd) || 0;
    const newTotal = currentBalance + saleAmount;
    const available = limit - currentBalance;
    
    return {
      hasLimit: true,
      limit,
      exceeded: newTotal > limit,
      currentBalance,
      newTotal,
      available: available > 0 ? available : 0,
    };
  }, [selectedCustomer, totalKwd, customerBalance]);

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

  // Validation: Check if customer is selected
  const isCustomerMissing = !customerId;

  // Validation: Check if there's at least one valid line item with item name, quantity > 0, and price > 0
  const hasValidLineItem = useMemo(() => {
    return lineItems.some(li => 
      li.itemName && 
      li.quantity > 0 && 
      parseFloat(li.priceKwd) > 0
    );
  }, [lineItems]);

  // Credit limit exceeded blocks non-admin users
  const creditLimitBlocked = creditLimitInfo.exceeded && !isAdmin;

  const canSubmit = useMemo(() => {
    // Customer is required
    if (isCustomerMissing) return false;
    // At least one valid line item with item, qty > 0, and price > 0 is required
    if (!hasValidLineItem) return false;
    // Cannot sell items that exceed available stock
    if (stockExceeded) return false;
    // Credit limit exceeded blocks non-admin users
    if (creditLimitBlocked) return false;
    return true;
  }, [isCustomerMissing, hasValidLineItem, stockExceeded, creditLimitBlocked]);

  // Get user's printer preference
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });
  
  const userPrinterType = userData?.printerType || "a5";

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
  const printThermal = async () => {
    const customerName = selectedCustomer?.name || "Walk-in Customer";
    const previousBalance = customerBalance?.balance || 0;
    const invoiceAmount = parseFloat(totalKwd) || 0;
    const currentBalance = previousBalance + invoiceAmount;
    
    const validItems = lineItems.filter(li => li.itemName && li.quantity > 0);
    
    // Generate QR code (no ID since this is before save)
    const qrDataUrl = await generateQRCodeDataURL({
      type: 'SALE',
      number: invoiceNumber || 'N/A',
      amount: invoiceAmount.toFixed(3),
      date: saleDate,
      partyName: customerName,
      partyType: 'customer',
    });
    
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
        ${qrDataUrl ? `
        <div style="text-align:center;margin-top:15px;padding-top:10px;border-top:1px dashed #000;">
          <img src="${qrDataUrl}" alt="QR Code" style="width:60px;height:60px;" />
          <div style="font-size:8px;margin-top:3px;">Scan to verify</div>
        </div>
        ` : ''}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // A5 printer print function
  const printA5 = async () => {
    const customerName = selectedCustomer?.name || "Walk-in Customer";
    const customerPhone = selectedCustomer?.phone || "";
    const customerAddress = "";
    const previousBalance = customerBalance?.balance || 0;
    const invoiceAmount = parseFloat(totalKwd) || 0;
    
    // Generate QR code (no ID since this is before save)
    const qrDataUrl = await generateQRCodeDataURL({
      type: 'SALE',
      number: invoiceNumber || 'N/A',
      amount: invoiceAmount.toFixed(3),
      date: saleDate,
      partyName: customerName,
      partyType: 'customer',
    });
    const currentBalance = previousBalance + invoiceAmount;
    
    const validItems = lineItems.filter(li => li.itemName && li.quantity > 0);
    
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;
    
    const itemsHtml = validItems.map((li, idx) => `
      <tr>
        <td style="padding:4px 3px;border:1px solid #ddd;text-align:center;">${idx + 1}</td>
        <td style="padding:4px 3px;border:1px solid #ddd;">${li.itemName}</td>
        <td style="padding:4px 3px;border:1px solid #ddd;text-align:center;">${li.quantity}</td>
        <td style="padding:4px 3px;border:1px solid #ddd;text-align:right;">${parseFloat(li.priceKwd || "0").toFixed(3)}</td>
        <td style="padding:4px 3px;border:1px solid #ddd;text-align:right;">${li.totalKwd}</td>
      </tr>
    `).join("");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Credit Invoice ${invoiceNumber}</title>
        <style>
          @page { size: A5; margin: 6mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 9px; color: #000; }
          .header { border: 1px solid #000; padding: 10px 12px; display: flex; align-items: center; gap: 12px; }
          .logo { width: 50px; height: 50px; border: 1px solid #000; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .company-info { flex: 1; }
          .company-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .company-details { font-size: 8px; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 16px; margin-bottom: 2px; }
          .invoice-title div { font-size: 9px; }
          .content { padding: 10px 12px; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
          .info-box { border: 1px solid #000; padding: 8px; border-radius: 3px; flex: 1; }
          .info-box h3 { font-weight: bold; margin-bottom: 5px; font-size: 10px; }
          .info-row { margin: 2px 0; font-size: 9px; }
          .info-label { font-weight: bold; display: inline-block; width: 60px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th { border: 1px solid #000; padding: 4px 3px; text-align: left; font-size: 8px; font-weight: bold; }
          td { font-size: 9px; border: 1px solid #000; }
          .totals-section { display: flex; justify-content: flex-end; }
          .totals-box { width: 180px; border: 1px solid #000; padding: 8px; border-radius: 3px; }
          .totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px; }
          .totals-row.total { font-weight: bold; font-size: 10px; border-top: 2px solid #000; padding-top: 5px; margin-top: 3px; }
          .footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #000; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 20px; }
          .signature-box { width: 120px; text-align: center; font-size: 8px; }
          .signature-line { border-top: 1px solid #000; margin-top: 30px; padding-top: 3px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : '<span style="color:#6B5B95;font-weight:bold;font-size:10px;">LOGO</span>'}
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
                <th style="width:30px;text-align:center;">#</th>
                <th>Description</th>
                <th style="width:50px;text-align:center;">Qty</th>
                <th style="width:70px;text-align:right;">Unit Price</th>
                <th style="width:70px;text-align:right;">Amount</th>
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
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;padding-top:10px;border-top:1px solid #000;">
              <div style="font-size:8px;color:#666;flex:1;">
                This is a computer generated document.<br/>
                No signature required. Validate by scanning QR code.
              </div>
              ${qrDataUrl ? `
              <div style="text-align:center;">
                <img src="${qrDataUrl}" alt="QR Code" style="width:50px;height:50px;" />
                <div style="font-size:7px;margin-top:2px;">Scan to verify</div>
              </div>
              ` : ''}
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
      salesmanId: salesmanId ? parseInt(salesmanId) : null,
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
      salesmanId: salesmanId ? parseInt(salesmanId) : null,
      totalKwd,
      lineItems,
    });
    
    // Print after saving
    printThermal();
    handleReset(true);
  };

  const handleSaveAndPrintA5 = async () => {
    if (!canSubmit) {
      return;
    }
    
    await onSubmit({
      saleDate,
      invoiceNumber,
      customerId: customerId ? parseInt(customerId) : null,
      salesmanId: salesmanId ? parseInt(salesmanId) : null,
      totalKwd,
      lineItems,
    });
    
    // Print after saving
    printA5();
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground" data-testid="text-credit-limit-info">
                    Credit Limit: {creditLimitInfo.limit.toFixed(3)} KWD | Available: <span className={creditLimitInfo.available <= 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-green-600 dark:text-green-400 font-medium"}>{creditLimitInfo.available.toFixed(3)} KWD</span>
                  </p>
                  {creditLimitInfo.exceeded && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium" data-testid="text-credit-exceeded-warning">
                      New balance ({creditLimitInfo.newTotal.toFixed(3)} KWD) will exceed credit limit!
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesman">Salesman</Label>
              <Select value={salesmanId} onValueChange={setSalesmanId}>
                <SelectTrigger data-testid="select-salesman">
                  <SelectValue placeholder="Select salesman" />
                </SelectTrigger>
                <SelectContent>
                  {salesmen.map((salesman) => (
                    <SelectItem key={salesman.id} value={salesman.id.toString()}>
                      {salesman.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="p-4 bg-sky-100 dark:bg-sky-900/30 rounded-md border border-gray-400 dark:border-gray-600">
            <div className="flex justify-end">
              <div className="text-right space-y-1">
                <Label className="text-xs text-muted-foreground">Total (KWD)</Label>
                <p className="text-2xl font-semibold font-mono" data-testid="text-sales-total-kwd">
                  {totalKwd} KWD
                </p>
              </div>
            </div>
          </div>

          {creditLimitInfo.exceeded && (
            <Alert variant="destructive" data-testid="alert-credit-limit-exceeded">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-1">
                <span className="font-medium">Credit Limit Exceeded!</span>
                <span>
                  This sale of {totalKwd} KWD will bring the customer balance to {creditLimitInfo.newTotal.toFixed(3)} KWD, 
                  which exceeds their credit limit of {creditLimitInfo.limit.toFixed(3)} KWD.
                </span>
                {isAdmin ? (
                  <span className="text-xs mt-1">As an admin, you can still proceed with this sale.</span>
                ) : (
                  <span className="text-xs mt-1">Contact an admin to approve this sale or collect payment first.</span>
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
                  if (userPrinterType === "a5") {
                    handleSaveAndPrintA5();
                  } else {
                    handleSaveAndPrintThermal();
                  }
                }}
                className="rounded-r-none border-r-0"
                data-testid="button-print-sales"
              >
                <Printer className="h-4 w-4 mr-2" />
                Save & Print ({userPrinterType === "a5" ? "A5" : "Thermal"})
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
                      if (userPrinterType !== "a5") updatePrinterMutation.mutate("a5");
                      handleSaveAndPrintA5();
                    }}
                    disabled={!canSubmit || isSubmitting}
                    data-testid="menu-print-a5"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    A5
                    {userPrinterType === "a5" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                  </DropdownMenuItem>
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
