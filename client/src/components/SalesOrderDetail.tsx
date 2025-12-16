import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import companyLogoUrl from "@/assets/company-logo.jpg";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Smartphone, FileDown, Send, Loader2, ChevronDown, FileText } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SalesOrderWithDetails, User } from "@shared/schema";

interface SalesOrderDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SalesOrderWithDetails | null;
}

export function SalesOrderDetail({
  open,
  onOpenChange,
  order,
}: SalesOrderDetailProps) {
  const { toast } = useToast();
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
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
  
  const { data: balanceData } = useQuery<{ previousBalance: number; currentBalance: number }>({
    queryKey: ["/api/customer-balance-for-sale", order?.id],
    enabled: open && !!order?.id && !!order?.customerId,
  });

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

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: { salesOrderId: number; phoneNumber: string }) => {
      const res = await apiRequest("POST", "/api/whatsapp/send-invoice", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice Sent",
        description: "Sales invoice has been sent via WhatsApp",
      });
      setShowWhatsAppDialog(false);
      setPhoneNumber("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send invoice via WhatsApp",
        variant: "destructive",
      });
    },
  });

  if (!order) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatNumber = (value: string | null, decimals: number) => {
    if (!value) return "—";
    return Number(value).toFixed(decimals);
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    if (num === 0) return 'Zero';
    
    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 1000);
    
    const convertHundreds = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };

    const convertNumber = (n: number): string => {
      if (n === 0) return '';
      let result = '';
      let scaleIndex = 0;
      while (n > 0) {
        const chunk = n % 1000;
        if (chunk > 0) {
          result = convertHundreds(chunk) + scales[scaleIndex] + ' ' + result;
        }
        n = Math.floor(n / 1000);
        scaleIndex++;
      }
      return result.trim();
    };

    let words = convertNumber(intPart) + ' Dinars';
    if (decPart > 0) {
      words += ' and ' + convertNumber(decPart) + ' Fils';
    }
    words += ' only';
    return words;
  };

  const formatTime = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatDateForInvoice = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Thermal printer print function (80mm receipt)
  const printThermal = () => {
    const customerName = order.customer?.name || "Walk-in Customer";
    const previousBalance = balanceData?.previousBalance || 0;
    const invoiceAmount = parseFloat(order.totalKwd || "0");
    const currentBalance = balanceData?.currentBalance || (previousBalance + invoiceAmount);
    
    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) return;
    
    const itemsHtml = order.lineItems.map(li => `
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
        <title>Invoice ${order.invoiceNumber || order.id}</title>
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
        <div class="info-row"><span>Date:</span><span>${formatDateForInvoice(order.saleDate)}</span></div>
        <div class="info-row"><span>Invoice:</span><span>${order.invoiceNumber || order.id}</span></div>
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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const subtotal = order.lineItems.reduce((sum, item) => sum + (parseFloat(item.totalKwd || "0")), 0);
    const totalQuantity = order.lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const amountInWords = numberToWords(subtotal);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credit Invoice ${order.invoiceNumber || order.id} - Iqbal Electronics</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Inter', Arial, sans-serif; 
              background: #fff;
              color: #000;
              line-height: 1.4;
              font-size: 12px;
            }
            
            .invoice-container {
              max-width: 850px;
              margin: 0 auto;
              padding: 20px 30px;
            }
            
            .top-title {
              text-align: center;
              margin-bottom: 15px;
            }
            
            .top-title h1 {
              font-size: 16px;
              font-weight: 600;
              text-decoration: underline;
              display: inline-block;
            }
            
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
            }
            
            .logo-section {
              text-align: left;
            }
            
            .logo-section .iec-text {
              font-size: 48px;
              font-weight: 700;
              color: #1a1a2e;
              letter-spacing: 2px;
              margin-bottom: 2px;
            }
            
            .logo-section .arabic-text {
              font-size: 12px;
              color: #333;
              direction: rtl;
            }
            
            .company-section {
              text-align: right;
            }
            
            .company-section .company-name {
              font-size: 18px;
              font-weight: 600;
              color: #1a1a2e;
              font-style: italic;
            }
            
            .company-section .phone {
              font-size: 12px;
              color: #333;
              margin-top: 4px;
            }
            
            .second-title {
              text-align: center;
              margin: 20px 0;
              font-size: 16px;
              font-weight: 600;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            
            .bill-to-section {
              flex: 1;
            }
            
            .bill-to-section .label {
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .bill-to-section .value {
              font-size: 12px;
              margin-bottom: 3px;
            }
            
            .invoice-details-section {
              text-align: right;
            }
            
            .invoice-details-section .title {
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .invoice-details-section .detail-row {
              font-size: 12px;
              margin-bottom: 3px;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 0;
            }
            
            .items-table thead tr {
              background: #8B7CB3;
              color: #fff;
            }
            
            .items-table th {
              padding: 8px 10px;
              text-align: left;
              font-size: 11px;
              font-weight: 600;
              border: 1px solid #8B7CB3;
            }
            
            .items-table th.text-center { text-align: center; }
            .items-table th.text-right { text-align: right; }
            
            .items-table td {
              padding: 8px 10px;
              border: 1px solid #ddd;
              font-size: 11px;
              vertical-align: middle;
            }
            
            .items-table td.text-center { text-align: center; }
            .items-table td.text-right { text-align: right; }
            
            .items-table .total-row {
              font-weight: 600;
              background: #f9f9f9;
            }
            
            .bottom-section {
              display: flex;
              margin-top: 0;
            }
            
            .left-column {
              flex: 1;
            }
            
            .right-column {
              width: 300px;
            }
            
            .section-header {
              background: #8B7CB3;
              color: #fff;
              padding: 6px 10px;
              font-size: 11px;
              font-weight: 600;
            }
            
            .section-content {
              padding: 8px 10px;
              border: 1px solid #ddd;
              border-top: none;
              font-size: 11px;
              min-height: 30px;
            }
            
            .amounts-table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .amounts-table td {
              padding: 6px 10px;
              border: 1px solid #ddd;
              font-size: 11px;
            }
            
            .amounts-table td:first-child {
              background: #f9f9f9;
            }
            
            .amounts-table td:last-child {
              text-align: right;
            }
            
            .amounts-header {
              background: #8B7CB3;
              color: #fff;
              padding: 6px 10px;
              font-size: 11px;
              font-weight: 600;
            }
            
            .balance-row td {
              padding: 6px 10px;
              border: 1px solid #ddd;
              font-size: 11px;
            }
            
            .balance-row td:first-child {
              background: #f9f9f9;
            }
            
            .balance-row td:last-child {
              text-align: right;
            }
            
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
            <!-- Top Title -->
            <div class="top-title">
              <h1>Credit Invoice</h1>
            </div>
            
            <!-- Header Row -->
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
            
            <!-- Second Title -->
            <div class="second-title">Credit Invoice</div>
            
            <!-- Info Row -->
            <div class="info-row">
              <div class="bill-to-section">
                <div class="label">Bill To</div>
                <div class="value"><strong>${order.customer?.name || "Walk-in Customer"}</strong></div>
                <div class="value">Kuwait</div>
                <div class="value">Contact No. : ${order.customer?.phone || "—"}</div>
              </div>
              <div class="invoice-details-section">
                <div class="title">Invoice Details</div>
                <div class="detail-row">Invoice No. : ${order.invoiceNumber || order.id}</div>
                <div class="detail-row">Date : ${formatDateForInvoice(order.saleDate)}</div>
                <div class="detail-row">Time : ${formatTime(order.saleDate)}</div>
              </div>
            </div>
            
            <!-- Items Table -->
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
                ${order.lineItems.map((item, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.itemName}</td>
                    <td>—</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">KWD ${formatNumber(item.priceKwd, 1)}</td>
                    <td class="text-center">0%</td>
                    <td class="text-right">KWD ${formatNumber(item.priceKwd, 1)}</td>
                    <td class="text-right">KWD ${formatNumber(item.totalKwd, 1)}</td>
                  </tr>
                `).join("")}
                <tr class="total-row">
                  <td></td>
                  <td><strong>Total</strong></td>
                  <td></td>
                  <td class="text-center">${totalQuantity}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td class="text-right"><strong>KWD ${subtotal.toFixed(1)}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <!-- Bottom Section -->
            <div class="bottom-section">
              <div class="left-column">
                <div class="section-header">Invoice Amount in Words</div>
                <div class="section-content">${amountInWords}</div>
                
                <div class="section-header">Payment mode</div>
                <div class="section-content">Credit</div>
                

              </div>
              
              <div class="right-column">
                <div class="amounts-header">Amounts</div>
                <table class="amounts-table">
                  <tr>
                    <td>Sub Total</td>
                    <td>KWD ${subtotal.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td>Total</td>
                    <td>KWD ${subtotal.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td>Balance</td>
                    <td>KWD ${subtotal.toFixed(1)}</td>
                  </tr>
                </table>
                <table class="amounts-table" style="margin-top: 10px;">
                  <tr class="balance-row">
                    <td>Previous Balance</td>
                    <td>KWD ${(balanceData?.previousBalance || 0).toFixed(2)}</td>
                  </tr>
                  <tr class="balance-row">
                    <td>Current Balance</td>
                    <td>KWD ${order.customerId ? (balanceData?.currentBalance || 0).toFixed(2) : subtotal.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(function() { window.print(); }, 300);
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) return;

    const subtotal = order.lineItems.reduce((sum, item) => sum + (parseFloat(item.totalKwd || "0")), 0);
    const totalQuantity = order.lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const amountInWords = numberToWords(subtotal);

    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credit Invoice ${order.invoiceNumber || order.id} - Iqbal Electronics</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Inter', Arial, sans-serif; 
              background: #fff;
              color: #000;
              line-height: 1.4;
              font-size: 12px;
            }
            
            .pdf-instructions {
              text-align: center;
              padding: 15px;
              background: #fef3c7;
              border: 2px solid #f59e0b;
              border-radius: 8px;
              margin: 10px 30px 20px 30px;
              font-size: 14px;
              color: #92400e;
            }
            
            .pdf-instructions strong {
              display: block;
              font-size: 16px;
              margin-bottom: 8px;
            }
            
            .pdf-instructions .shortcut {
              display: inline-block;
              background: #fff;
              border: 1px solid #d97706;
              padding: 4px 12px;
              border-radius: 4px;
              font-family: monospace;
              font-weight: 600;
              margin: 4px;
            }
            
            .invoice-container {
              max-width: 850px;
              margin: 0 auto;
              padding: 20px 30px;
            }
            
            .top-title {
              text-align: center;
              margin-bottom: 15px;
            }
            
            .top-title h1 {
              font-size: 16px;
              font-weight: 600;
              text-decoration: underline;
              display: inline-block;
            }
            
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
            }
            
            .logo-section {
              text-align: left;
            }
            
            .logo-section .iec-text {
              font-size: 48px;
              font-weight: 700;
              color: #1a1a2e;
              letter-spacing: 2px;
              margin-bottom: 2px;
            }
            
            .logo-section .arabic-text {
              font-size: 12px;
              color: #333;
              direction: rtl;
            }
            
            .company-section {
              text-align: right;
            }
            
            .company-section .company-name {
              font-size: 18px;
              font-weight: 600;
              color: #1a1a2e;
              font-style: italic;
            }
            
            .company-section .phone {
              font-size: 12px;
              color: #333;
              margin-top: 4px;
            }
            
            .second-title {
              text-align: center;
              margin: 20px 0;
              font-size: 16px;
              font-weight: 600;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            
            .bill-to-section {
              flex: 1;
            }
            
            .bill-to-section .label {
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .bill-to-section .value {
              font-size: 12px;
              margin-bottom: 3px;
            }
            
            .invoice-details-section {
              text-align: right;
            }
            
            .invoice-details-section .title {
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .invoice-details-section .detail-row {
              font-size: 12px;
              margin-bottom: 3px;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 0;
            }
            
            .items-table thead tr {
              background: #8B7CB3;
              color: #fff;
            }
            
            .items-table th {
              padding: 8px 10px;
              text-align: left;
              font-size: 11px;
              font-weight: 600;
              border: 1px solid #8B7CB3;
            }
            
            .items-table th.text-center { text-align: center; }
            .items-table th.text-right { text-align: right; }
            
            .items-table td {
              padding: 8px 10px;
              border: 1px solid #ddd;
              font-size: 11px;
              vertical-align: middle;
            }
            
            .items-table td.text-center { text-align: center; }
            .items-table td.text-right { text-align: right; }
            
            .items-table .total-row {
              font-weight: 600;
              background: #f9f9f9;
            }
            
            .bottom-section {
              display: flex;
              margin-top: 0;
            }
            
            .left-column {
              flex: 1;
            }
            
            .right-column {
              width: 300px;
            }
            
            .section-header {
              background: #8B7CB3;
              color: #fff;
              padding: 6px 10px;
              font-size: 11px;
              font-weight: 600;
            }
            
            .section-content {
              padding: 8px 10px;
              border: 1px solid #ddd;
              border-top: none;
              font-size: 11px;
              min-height: 30px;
            }
            
            .amounts-table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .amounts-table td {
              padding: 6px 10px;
              border: 1px solid #ddd;
              font-size: 11px;
            }
            
            .amounts-table td:first-child {
              background: #f9f9f9;
            }
            
            .amounts-table td:last-child {
              text-align: right;
            }
            
            .amounts-header {
              background: #8B7CB3;
              color: #fff;
              padding: 6px 10px;
              font-size: 11px;
              font-weight: 600;
            }
            
            .balance-row td {
              padding: 6px 10px;
              border: 1px solid #ddd;
              font-size: 11px;
            }
            
            .balance-row td:first-child {
              background: #f9f9f9;
            }
            
            .balance-row td:last-child {
              text-align: right;
            }
            
            @media print {
              .pdf-instructions { display: none !important; }
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
          <div class="pdf-instructions">
            <strong>Save Invoice as PDF</strong>
            Press <span class="shortcut">Ctrl + P</span> (Windows) or <span class="shortcut">Cmd + P</span> (Mac)<br>
            Then select <strong>"Save as PDF"</strong> or <strong>"Microsoft Print to PDF"</strong> as the destination.
          </div>
          <div class="invoice-container">
            <!-- Top Title -->
            <div class="top-title">
              <h1>Credit Invoice</h1>
            </div>
            
            <!-- Header Row -->
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
            
            <!-- Second Title -->
            <div class="second-title">Credit Invoice</div>
            
            <!-- Info Row -->
            <div class="info-row">
              <div class="bill-to-section">
                <div class="label">Bill To</div>
                <div class="value"><strong>${order.customer?.name || "Walk-in Customer"}</strong></div>
                <div class="value">Kuwait</div>
                <div class="value">Contact No. : ${order.customer?.phone || "—"}</div>
              </div>
              <div class="invoice-details-section">
                <div class="title">Invoice Details</div>
                <div class="detail-row">Invoice No. : ${order.invoiceNumber || order.id}</div>
                <div class="detail-row">Date : ${formatDateForInvoice(order.saleDate)}</div>
                <div class="detail-row">Time : ${formatTime(order.saleDate)}</div>
              </div>
            </div>
            
            <!-- Items Table -->
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
                ${order.lineItems.map((item, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.itemName}</td>
                    <td>—</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">KWD ${formatNumber(item.priceKwd, 1)}</td>
                    <td class="text-center">0%</td>
                    <td class="text-right">KWD ${formatNumber(item.priceKwd, 1)}</td>
                    <td class="text-right">KWD ${formatNumber(item.totalKwd, 1)}</td>
                  </tr>
                `).join("")}
                <tr class="total-row">
                  <td></td>
                  <td><strong>Total</strong></td>
                  <td></td>
                  <td class="text-center">${totalQuantity}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td class="text-right"><strong>KWD ${subtotal.toFixed(1)}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <!-- Bottom Section -->
            <div class="bottom-section">
              <div class="left-column">
                <div class="section-header">Invoice Amount in Words</div>
                <div class="section-content">${amountInWords}</div>
                
                <div class="section-header">Payment mode</div>
                <div class="section-content">Credit</div>
                

              </div>
              
              <div class="right-column">
                <div class="amounts-header">Amounts</div>
                <table class="amounts-table">
                  <tr>
                    <td>Sub Total</td>
                    <td>KWD ${subtotal.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td>Total</td>
                    <td>KWD ${subtotal.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td>Balance</td>
                    <td>KWD ${subtotal.toFixed(1)}</td>
                  </tr>
                </table>
                <table class="amounts-table" style="margin-top: 10px;">
                  <tr class="balance-row">
                    <td>Previous Balance</td>
                    <td>KWD ${(balanceData?.previousBalance || 0).toFixed(2)}</td>
                  </tr>
                  <tr class="balance-row">
                    <td>Current Balance</td>
                    <td>KWD ${order.customerId ? (balanceData?.currentBalance || 0).toFixed(2) : subtotal.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);

    pdfWindow.document.close();
  };

  const handleWhatsAppSend = () => {
    setPhoneNumber(order.customer?.phone || "");
    setShowWhatsAppDialog(true);
  };

  const handleSendWhatsApp = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    sendWhatsAppMutation.mutate({
      salesOrderId: order.id,
      phoneNumber: phoneNumber.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <DialogTitle data-testid="dialog-title-so-detail">Sales Invoice Details</DialogTitle>
          <div className="flex gap-2">
            <div className="flex">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (userPrinterType === "a4laser") {
                    handlePrint();
                  } else {
                    printThermal();
                  }
                }}
                className="rounded-r-none border-r-0"
                data-testid="button-print-invoice"
              >
                <Printer className="h-4 w-4 mr-1" />
                Print ({userPrinterType === "a4laser" ? "A4" : "Thermal"})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-l-none px-2" data-testid="button-print-dropdown">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (userPrinterType !== "thermal") updatePrinterMutation.mutate("thermal");
                      printThermal();
                    }}
                    data-testid="menu-print-thermal"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Thermal (80mm)
                    {userPrinterType === "thermal" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (userPrinterType !== "a4laser") updatePrinterMutation.mutate("a4laser");
                      handlePrint();
                    }}
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
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              data-testid="button-download-pdf"
            >
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppSend}
              className="text-green-600"
              data-testid="button-whatsapp-share"
            >
              <SiWhatsapp className="h-4 w-4 mr-1" />
              Send
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sale Date</p>
              <p className="font-medium" data-testid="text-so-date">{formatDate(order.saleDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Invoice Number</p>
              <p className="font-medium font-mono" data-testid="text-so-invoice">
                {order.invoiceNumber || "—"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Customer</p>
            <p className="font-medium" data-testid="text-so-customer">
              {order.customer?.name || "—"}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Line Items</p>
            {order.lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items</p>
            ) : (
              <div className="space-y-3">
                {order.lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-md bg-muted/50"
                    data-testid={`item-row-${index}`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × {formatNumber(item.priceKwd, 3)} KWD
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <p>{formatNumber(item.totalKwd, 3)} KWD</p>
                      </div>
                    </div>
                    {item.imeiNumbers && item.imeiNumbers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Smartphone className="h-3 w-3" />
                          <span>IMEI Numbers ({item.imeiNumbers.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.imeiNumbers.map((imei, imeiIndex) => (
                            <Badge 
                              key={imeiIndex} 
                              variant="secondary" 
                              className="text-xs font-mono"
                              data-testid={`imei-badge-${index}-${imeiIndex}`}
                            >
                              {imei}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="p-3 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Total (KWD)</p>
            <p className="text-lg font-semibold font-mono" data-testid="text-so-total-kwd">
              {formatNumber(order.totalKwd, 3)}
            </p>
          </div>

          {order.deliveryDate && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
              <p className="font-medium" data-testid="text-so-delivery">{formatDate(order.deliveryDate)}</p>
            </div>
          )}
        </div>
      </DialogContent>

      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SiWhatsapp className="h-5 w-5 text-green-600" />
              Send Invoice via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Send this invoice directly to the customer's WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">Phone Number</Label>
              <Input
                id="whatsapp-phone"
                placeholder="e.g., 96599123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                data-testid="input-whatsapp-phone"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full phone number with country code (e.g., 965 for Kuwait)
              </p>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-sm">
              <p className="font-medium mb-1">Invoice: {order.invoiceNumber || `INV-${order.id}`}</p>
              <p className="text-muted-foreground">Total: {formatNumber(order.totalKwd, 3)} KWD</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWhatsAppDialog(false)}
              data-testid="button-cancel-whatsapp"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              disabled={sendWhatsAppMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-whatsapp"
            >
              {sendWhatsAppMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
