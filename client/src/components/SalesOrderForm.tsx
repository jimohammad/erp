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
  const stockExceeded = useMemo(() => {
    return lineItems.some((li) => {
      if (!li.itemName || li.quantity <= 0) return false;
      const available = stockMap.get(li.itemName) ?? 0;
      return li.quantity > available;
    });
  }, [lineItems, stockMap]);

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

  const canSubmit = useMemo(() => {
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
  }, [creditLimitInfo.exceeded, isAdmin, stockExceeded, pricesBelowMinimum]);

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
                  const customerName = selectedCustomer?.name || "Walk-in Customer";
                  const customerPhone = selectedCustomer?.phone || "—";
                  const prevBal = customerBalance?.balance || 0;
                  const invAmt = parseFloat(totalKwd) || 0;
                  const currBal = prevBal + invAmt;
                  const validItems = lineItems.filter(li => li.itemName);
                  const totalQty = validItems.reduce((sum, li) => sum + (parseInt(li.quantity) || 0), 0);
                  
                  const numberToWords = (num: number): string => {
                    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
                    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
                    const scales = ['', 'Thousand', 'Million', 'Billion'];
                    if (num === 0) return 'Zero';
                    const intPart = Math.floor(num);
                    const decPart = Math.round((num - intPart) * 1000);
                    const convertHundreds = (n: number): string => {
                      let result = '';
                      if (n >= 100) { result += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
                      if (n >= 20) { result += tens[Math.floor(n / 10)] + ' '; n %= 10; }
                      if (n > 0) { result += ones[n] + ' '; }
                      return result;
                    };
                    const convertNumber = (n: number): string => {
                      if (n === 0) return '';
                      let result = '';
                      let scaleIndex = 0;
                      while (n > 0) {
                        const chunk = n % 1000;
                        if (chunk > 0) { result = convertHundreds(chunk) + scales[scaleIndex] + ' ' + result; }
                        n = Math.floor(n / 1000);
                        scaleIndex++;
                      }
                      return result.trim();
                    };
                    let words = convertNumber(intPart) + ' Dinars';
                    if (decPart > 0) { words += ' and ' + convertNumber(decPart) + ' Fils'; }
                    words += ' only';
                    return words;
                  };
                  
                  const amountInWords = numberToWords(invAmt);
                  const formatDate = (d: string) => {
                    const date = new Date(d);
                    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
                  };
                  const formatTime = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
                  
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Credit Invoice ${invoiceNumber || "N/A"} - Iqbal Electronics</title>
                      <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #000; line-height: 1.4; font-size: 12px; }
                        .invoice-container { max-width: 850px; margin: 0 auto; padding: 20px 30px; }
                        .top-title { text-align: center; margin-bottom: 15px; }
                        .top-title h1 { font-size: 16px; font-weight: 600; text-decoration: underline; display: inline-block; }
                        .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                        .logo-section { text-align: left; }
                        .logo-section .iec-text { font-size: 48px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; margin-bottom: 2px; }
                        .logo-section .arabic-text { font-size: 12px; color: #333; direction: rtl; }
                        .company-section { text-align: right; }
                        .company-section .company-name { font-size: 18px; font-weight: 600; color: #1a1a2e; font-style: italic; }
                        .company-section .phone { font-size: 12px; color: #333; margin-top: 4px; }
                        .second-title { text-align: center; margin: 20px 0; font-size: 16px; font-weight: 600; }
                        .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
                        .bill-to-section { flex: 1; }
                        .bill-to-section .label { font-weight: 600; margin-bottom: 5px; }
                        .bill-to-section .value { font-size: 12px; margin-bottom: 3px; }
                        .invoice-details-section { text-align: right; }
                        .invoice-details-section .title { font-weight: 600; margin-bottom: 5px; }
                        .invoice-details-section .detail-row { font-size: 12px; margin-bottom: 3px; }
                        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
                        .items-table thead tr { background: #8B7CB3; color: #fff; }
                        .items-table th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; border: 1px solid #8B7CB3; }
                        .items-table th.text-center { text-align: center; }
                        .items-table th.text-right { text-align: right; }
                        .items-table td { padding: 8px 10px; border: 1px solid #ddd; font-size: 11px; vertical-align: middle; }
                        .items-table td.text-center { text-align: center; }
                        .items-table td.text-right { text-align: right; }
                        .items-table .total-row { font-weight: 600; background: #f9f9f9; }
                        .bottom-section { display: flex; margin-top: 0; }
                        .left-column { flex: 1; }
                        .right-column { width: 300px; }
                        .section-header { background: #8B7CB3; color: #fff; padding: 6px 10px; font-size: 11px; font-weight: 600; }
                        .section-content { padding: 8px 10px; border: 1px solid #ddd; border-top: none; font-size: 11px; min-height: 30px; }
                        .amounts-table { width: 100%; border-collapse: collapse; }
                        .amounts-table td { padding: 6px 10px; border: 1px solid #ddd; font-size: 11px; }
                        .amounts-table td:first-child { background: #f9f9f9; }
                        .amounts-table td:last-child { text-align: right; }
                        .amounts-header { background: #8B7CB3; color: #fff; padding: 6px 10px; font-size: 11px; font-weight: 600; }
                        .balance-row td { padding: 6px 10px; border: 1px solid #ddd; font-size: 11px; }
                        .balance-row td:first-child { background: #f9f9f9; }
                        .balance-row td:last-child { text-align: right; }
                        @media print {
                          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                          .invoice-container { padding: 15px; }
                          .items-table thead tr { background: #8B7CB3 !important; }
                          .section-header { background: #8B7CB3 !important; }
                          .amounts-header { background: #8B7CB3 !important; }
                        }
                        @page { margin: 0.5cm; }
                      </style>
                    </head>
                    <body>
                      <div class="invoice-container">
                        <div class="top-title"><h1>Credit Invoice</h1></div>
                        <div class="header-row">
                          <div class="logo-section">
                            ${logoBase64 ? `<img src="${logoBase64}" style="height: 60px; width: auto;" alt="IEC" />` : `<div class="iec-text">IEC</div>`}
                            <div class="arabic-text">شركة إقبال للأجهزة إلكترونية ذ.م.م</div>
                          </div>
                          <div class="company-section">
                            <div class="company-name">Iqbal Electronics Co. WLL</div>
                            <div class="phone">Phone no.: +965 55584488</div>
                          </div>
                        </div>
                        <div class="second-title">Credit Invoice</div>
                        <div class="info-row">
                          <div class="bill-to-section">
                            <div class="label">Bill To</div>
                            <div class="value"><strong>${customerName}</strong></div>
                            <div class="value">Kuwait</div>
                            <div class="value">Contact No. : ${customerPhone}</div>
                          </div>
                          <div class="invoice-details-section">
                            <div class="title">Invoice Details</div>
                            <div class="detail-row">Invoice No. : ${invoiceNumber || "N/A"}</div>
                            <div class="detail-row">Date : ${formatDate(saleDate)}</div>
                            <div class="detail-row">Time : ${formatTime()}</div>
                          </div>
                        </div>
                        <table class="items-table">
                          <thead>
                            <tr>
                              <th style="width: 30px;" class="text-center">#</th>
                              <th>Item name</th>
                              <th style="width: 120px;">Item Code</th>
                              <th style="width: 60px;" class="text-center">Quantity</th>
                              <th style="width: 80px;" class="text-right">Price/ Unit</th>
                              <th style="width: 50px;" class="text-center">VAT %</th>
                              <th style="width: 80px;" class="text-right">Final Rate</th>
                              <th style="width: 90px;" class="text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${validItems.map((li, idx) => {
                              const item = items.find(i => i.name === li.itemName);
                              return `<tr>
                                <td class="text-center">${idx + 1}</td>
                                <td>${li.itemName}${li.imeiNumbers && li.imeiNumbers.length > 0 ? `<br><small style="color:#666;">IMEI: ${li.imeiNumbers.join(", ")}</small>` : ""}</td>
                                <td>${item?.itemCode || "—"}</td>
                                <td class="text-center">${li.quantity}</td>
                                <td class="text-right">KWD ${parseFloat(li.priceKwd || "0").toFixed(1)}</td>
                                <td class="text-center">0%</td>
                                <td class="text-right">KWD ${parseFloat(li.priceKwd || "0").toFixed(1)}</td>
                                <td class="text-right">KWD ${parseFloat(li.totalKwd || "0").toFixed(1)}</td>
                              </tr>`;
                            }).join("")}
                            <tr class="total-row">
                              <td></td>
                              <td><strong>Total</strong></td>
                              <td></td>
                              <td class="text-center">${totalQty}</td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td class="text-right"><strong>KWD ${invAmt.toFixed(1)}</strong></td>
                            </tr>
                          </tbody>
                        </table>
                        <div class="bottom-section">
                          <div class="left-column">
                            <div class="section-header">Invoice Amount in Words</div>
                            <div class="section-content">${amountInWords}</div>
                            <div class="section-header">Payment mode</div>
                            <div class="section-content">Credit</div>
                            <div class="section-header">Terms and Conditions</div>
                            <div class="section-content">Thanks for Shopping<br>Signature</div>
                          </div>
                          <div class="right-column">
                            <div class="amounts-header">Amounts</div>
                            <table class="amounts-table">
                              <tr><td>Sub Total</td><td>KWD ${invAmt.toFixed(1)}</td></tr>
                              <tr><td>Total</td><td>KWD ${invAmt.toFixed(1)}</td></tr>
                              <tr><td>Balance</td><td>KWD ${invAmt.toFixed(1)}</td></tr>
                            </table>
                            <table class="amounts-table" style="margin-top: 10px;">
                              <tr class="balance-row"><td>Previous Balance</td><td>KWD ${prevBal.toFixed(2)}</td></tr>
                              <tr class="balance-row"><td>Current Balance</td><td>KWD ${customerId ? currBal.toFixed(2) : invAmt.toFixed(2)}</td></tr>
                            </table>
                          </div>
                        </div>
                      </div>
                      <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
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
