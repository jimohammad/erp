import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import companyLogoUrl from "@/assets/company-logo.jpg";
import { generateQRCodeDataURL } from "@/lib/qrcode";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Eye, Trash2, Receipt, ShoppingBag, ChevronLeft, ChevronRight, Printer, FileDown, Pencil, Plus, X, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiWhatsapp } from "react-icons/si";
import { format } from "date-fns";
import { usePasswordProtection } from "@/components/PasswordConfirmDialog";

const PAGE_SIZE = 50;

interface SalesOrderLineItem {
  id: number;
  itemName: string;
  quantity: number;
  priceKwd: string | null;
  totalKwd: string | null;
  imeiNumbers: string[] | null;
}

interface SalesOrder {
  id: number;
  saleDate: string;
  invoiceNumber: string | null;
  totalKwd: string | null;
  customer: { id: number; name: string; balance?: string | null; phone?: string | null; address?: string | null } | null;
  lineItems: SalesOrderLineItem[];
  createdAt: string | null;
}

export default function AllSalesPage() {
  const { toast } = useToast();
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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const { requestPasswordConfirmation, PasswordDialog } = usePasswordProtection();
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const viewId = new URLSearchParams(searchParams).get("viewId");
  
  // Edit state
  const [editSO, setEditSO] = useState<SalesOrder | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editCustomerId, setEditCustomerId] = useState<string>("");
  const [editLineItems, setEditLineItems] = useState<{ id: string; itemName: string; quantity: number; priceKwd: string; imeiNumbers: string[] }[]>([]);
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const { data: salesData, isLoading } = useQuery<{ data: SalesOrder[]; total: number }>({
    queryKey: [`/api/sales-orders?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`],
  });
  
  const salesOrders = salesData?.data ?? [];
  const totalOrders = salesData?.total ?? 0;
  const totalPages = Math.ceil(totalOrders / PAGE_SIZE);

  // Fetch specific order when viewId is present
  const viewIdNum = viewId ? parseInt(viewId) : null;
  const { data: viewIdOrder } = useQuery<SalesOrder>({
    queryKey: ["/api/sales-orders", viewIdNum],
    queryFn: async () => {
      const res = await fetch(`/api/sales-orders/${viewIdNum}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!viewIdNum,
  });

  // Auto-open dialog when viewId order is loaded
  useEffect(() => {
    if (viewIdOrder && viewId) {
      setSelectedSO(viewIdOrder);
      navigate("/sales", { replace: true });
    }
  }, [viewIdOrder, viewId, navigate]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/sales-orders/${id}`);
    },
    onSuccess: () => {
      // Invalidate all related queries for real-time updates
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/sales-orders');
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/balances/all"] });
      toast({ title: "Sales invoice deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      setDeleteId(null);
    },
  });

  // Fetch customers for edit dropdown
  const { data: customers = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/customers"],
  });
  
  // Fetch items for edit dropdown
  const { data: items = [] } = useQuery<{ id: number; name: string; sellingPriceKwd: string | null }[]>({
    queryKey: ["/api/items"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { saleDate: string; invoiceNumber: string; customerId: number | null; totalKwd: string; lineItems: { itemName: string; quantity: number; priceKwd: string; totalKwd: string; imeiNumbers: string[] }[] } }) => {
      return await apiRequest("PUT", `/api/sales-orders/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate all related queries for real-time updates
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/sales-orders');
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/balances/all"] });
      toast({ title: "Sales invoice updated successfully" });
      setEditSO(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (so: SalesOrder) => {
    setEditSO(so);
    setEditDate(so.saleDate);
    setEditInvoiceNumber(so.invoiceNumber || "");
    setEditCustomerId(so.customer?.id.toString() || "");
    setEditLineItems(
      so.lineItems.map((item, idx) => ({
        id: `edit-${idx}`,
        itemName: item.itemName,
        quantity: item.quantity,
        priceKwd: item.priceKwd || "",
        imeiNumbers: item.imeiNumbers || [],
      }))
    );
  };

  const handleEditSubmit = () => {
    if (!editSO) return;
    
    const validItems = editLineItems.filter(item => item.itemName && item.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }
    
    // Validate all items have valid prices
    const hasInvalidPrice = validItems.some(item => {
      const price = parseFloat(item.priceKwd || "0");
      return isNaN(price) || price < 0;
    });
    
    if (hasInvalidPrice) {
      toast({ title: "Please enter valid prices for all items", variant: "destructive" });
      return;
    }
    
    const totalKwd = validItems.reduce((sum, item) => {
      return sum + (item.quantity * parseFloat(item.priceKwd || "0"));
    }, 0).toFixed(3);
    
    updateMutation.mutate({
      id: editSO.id,
      data: {
        saleDate: editDate,
        invoiceNumber: editInvoiceNumber,
        customerId: editCustomerId ? parseInt(editCustomerId) : null,
        totalKwd,
        lineItems: validItems.map(item => {
          const price = parseFloat(item.priceKwd || "0");
          return {
            itemName: item.itemName,
            quantity: item.quantity,
            priceKwd: price.toFixed(3),
            totalKwd: (item.quantity * price).toFixed(3),
            imeiNumbers: item.imeiNumbers,
          };
        }),
      },
    });
  };

  const addEditLineItem = () => {
    setEditLineItems(prev => [...prev, { id: `edit-${Date.now()}`, itemName: "", quantity: 1, priceKwd: "", imeiNumbers: [] }]);
  };

  const removeEditLineItem = (id: string) => {
    setEditLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateEditLineItem = (id: string, field: string, value: string | number) => {
    setEditLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === "itemName" && typeof value === "string") {
        const foundItem = items.find(i => i.name === value);
        if (foundItem?.sellingPriceKwd) {
          updated.priceKwd = foundItem.sellingPriceKwd;
        }
      }
      return updated;
    }));
  };

  const filteredOrders = salesOrders.filter((so) => {
    const query = searchQuery.toLowerCase();
    return (
      so.invoiceNumber?.toLowerCase().includes(query) ||
      so.customer?.name.toLowerCase().includes(query) ||
      so.lineItems.some(item => item.itemName.toLowerCase().includes(query))
    );
  });

  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(num);
  };

  const escapeHtml = (text: string | null | undefined): string => {
    if (!text) return "-";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const handlePrintInvoice = async () => {
    if (!selectedSO) return;

    // Generate QR code
    const invoiceAmount = parseFloat(selectedSO.totalKwd || "0");
    const qrDataUrl = await generateQRCodeDataURL({
      type: 'SALE',
      id: selectedSO.id,
      number: selectedSO.invoiceNumber || `INV-${selectedSO.id}`,
      amount: invoiceAmount.toFixed(3),
      date: selectedSO.saleDate,
      partyName: selectedSO.customer?.name || "Walk-in Customer",
      partyType: 'customer',
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const lineItemsHtml = selectedSO.lineItems.map(item => `
      <div class="item-row">
        <div class="item-name">${escapeHtml(item.itemName)}</div>
        <div class="item-details">${item.quantity} x ${formatCurrency(item.priceKwd)} = ${formatCurrency(parseFloat(item.priceKwd || "0") * item.quantity)}</div>
      </div>
    `).join("");

    const prevBalance = parseFloat(selectedSO.customer?.balance || "0");
    const currBalance = prevBalance + invoiceAmount;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${escapeHtml(selectedSO.invoiceNumber) || "No Number"}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            html, body {
              height: auto;
              min-height: 0;
            }
            
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
            
            .doc-type {
              font-size: 10pt;
              font-weight: bold;
              margin-top: 1mm;
            }
            
            .info {
              margin-bottom: 2mm;
              font-size: 9pt;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 1mm 0;
            }
            
            .items {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 2mm 0;
              margin: 2mm 0;
            }
            
            .item-row {
              margin-bottom: 2mm;
              font-size: 9pt;
            }
            
            .item-name {
              font-weight: bold;
            }
            
            .item-details {
              text-align: right;
            }
            
            .item-imei {
              font-size: 7pt;
              color: #333;
              word-break: break-all;
            }
            
            .total-box {
              text-align: center;
              padding: 2mm;
              margin: 2mm 0;
              border: 2px solid #000;
            }
            
            .total-label {
              font-size: 8pt;
            }
            
            .total-value {
              font-size: 14pt;
              font-weight: bold;
            }
            
            .footer {
              text-align: center;
              padding-top: 2mm;
              font-size: 8pt;
            }
            
            @media print {
              html, body { height: auto; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; margin-bottom: 1mm;" alt="IEC" /><div class="company-name">Iqbal Electronics Co. WLL</div>` : `<div class="company-name">Iqbal Electronics Co.</div><div class="company-sub">WLL</div>`}
              <div class="doc-type">Sales Invoice</div>
            </div>
            
            <div class="info">
              <div class="info-row">
                <span>Date:</span>
                <span>${format(new Date(selectedSO.saleDate), "dd-MM-yyyy")}</span>
              </div>
              <div class="info-row">
                <span>Invoice:</span>
                <span style="font-weight:bold">${escapeHtml(selectedSO.invoiceNumber)}</span>
              </div>
              <div class="info-row">
                <span>Customer:</span>
                <span>${escapeHtml(selectedSO.customer?.name)}</span>
              </div>
            </div>
            
            <div class="items">
              ${lineItemsHtml}
            </div>
            
            <div class="total-box">
              <div class="total-label">Invoice Total</div>
              <div class="total-value">${invoiceAmount.toFixed(3)} KWD</div>
            </div>
            
            <div class="balance-section" style="font-size: 9pt; margin: 2mm 0; padding: 2mm 0; border-top: 1px dashed #000;">
              <div class="info-row">
                <span>Prev. Balance:</span>
                <span>${prevBalance.toFixed(3)} KWD</span>
              </div>
              <div class="info-row" style="font-weight: bold;">
                <span>Current Balance:</span>
                <span>${currBalance.toFixed(3)} KWD</span>
              </div>
            </div>
            
            <div class="footer">
              Thank You!
            </div>
            ${qrDataUrl ? `
            <div style="text-align:center;margin-top:8px;padding-top:8px;border-top:1px dashed #000;">
              <img src="${qrDataUrl}" alt="QR Code" style="width:60px;height:60px;" />
              <div style="font-size:8px;margin-top:3px;">Scan to verify</div>
            </div>
            ` : ''}
          </div>
          
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    if (!selectedSO) return;
    const pdfWindow = window.open("", "_blank", "width=800,height=900");
    if (!pdfWindow) return;

    const customerName = selectedSO.customer?.name || "Walk-in Customer";
    const customerPhone = selectedSO.customer?.phone || "";
    const customerAddress = selectedSO.customer?.address || "";
    const previousBalance = parseFloat(selectedSO.customer?.balance || "0");
    const invoiceAmount = parseFloat(selectedSO.totalKwd || "0");
    const currentBalance = previousBalance + invoiceAmount;
    const saleDate = format(new Date(selectedSO.saleDate), "yyyy-MM-dd");

    // Generate QR code for A5 PDF
    const qrDataUrl = await generateQRCodeDataURL({
      type: 'SALE',
      id: selectedSO.id,
      number: selectedSO.invoiceNumber || `INV-${selectedSO.id}`,
      amount: invoiceAmount.toFixed(3),
      date: selectedSO.saleDate,
      partyName: customerName,
      partyType: 'customer',
    });

    const itemsHtml = selectedSO.lineItems.map((li, idx) => `
      <tr>
        <td style="padding:8px;border:1px solid #000;text-align:center;">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #000;">${escapeHtml(li.itemName)}</td>
        <td style="padding:8px;border:1px solid #000;text-align:center;">${li.quantity}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right;">${parseFloat(li.priceKwd || "0").toFixed(3)}</td>
        <td style="padding:8px;border:1px solid #000;text-align:right;">${(li.quantity * parseFloat(li.priceKwd || "0")).toFixed(3)}</td>
      </tr>
    `).join("");

    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Credit Invoice ${escapeHtml(selectedSO.invoiceNumber)}</title>
        <style>
          @page { size: A5; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
          .header { border: 1px solid #000; padding: 20px; display: flex; align-items: center; gap: 20px; }
          .logo { width: 80px; height: 80px; border: 1px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .company-info { flex: 1; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .company-details { font-size: 11px; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 28px; margin-bottom: 5px; }
          .content { padding: 20px; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-box { border: 1px solid #000; padding: 15px; border-radius: 5px; width: 48%; }
          .info-box h3 { font-weight: bold; margin-bottom: 10px; font-size: 14px; }
          .info-row { margin: 5px 0; }
          .info-label { font-weight: bold; display: inline-block; width: 100px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { border: 1px solid #000; padding: 10px; text-align: left; font-weight: bold; }
          td { border: 1px solid #000; }
          .totals-section { display: flex; justify-content: flex-end; }
          .totals-box { width: 300px; border: 1px solid #000; padding: 15px; border-radius: 5px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .totals-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; margin-top: 5px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          .terms { font-size: 10px; color: #666; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
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
            <div>${escapeHtml(selectedSO.invoiceNumber) || "N/A"}</div>
          </div>
        </div>
        <div class="content">
          <div class="info-section">
            <div class="info-box">
              <h3>Bill To</h3>
              <div class="info-row"><span class="info-label">Customer:</span> ${escapeHtml(customerName)}</div>
              ${customerPhone ? `<div class="info-row"><span class="info-label">Phone:</span> ${escapeHtml(customerPhone)}</div>` : ""}
              ${customerAddress ? `<div class="info-row"><span class="info-label">Address:</span> ${escapeHtml(customerAddress)}</div>` : ""}
            </div>
            <div class="info-box">
              <h3>Invoice Details</h3>
              <div class="info-row"><span class="info-label">Invoice No:</span> ${escapeHtml(selectedSO.invoiceNumber) || "N/A"}</div>
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
            <div class="terms">
              <strong>Terms & Conditions:</strong><br/>
              1. Goods once sold will not be taken back or exchanged.<br/>
              2. Payment is due within the agreed credit period.<br/>
              3. All disputes are subject to local jurisdiction.
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:10px;border-top:1px solid #000;">
              <div style="font-size:9px;color:#666;flex:1;">
                This is a computer generated document.<br/>
                No signature required. Validate by scanning QR code.
              </div>
              ${qrDataUrl ? `
              <div style="text-align:center;">
                <img src="${qrDataUrl}" alt="QR Code" style="width:60px;height:60px;" />
                <div style="font-size:8px;margin-top:3px;">Scan to verify</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    pdfWindow.document.close();
  };

  const handleWhatsAppShare = () => {
    if (!selectedSO) return;
    const lineItemsText = selectedSO.lineItems.map((item, index) => 
      `${index + 1}. ${item.itemName} - Qty: ${item.quantity} - ${formatCurrency(item.priceKwd)} KWD${item.imeiNumbers?.length ? `\n   IMEI: ${item.imeiNumbers.join(", ")}` : ""}`
    ).join("\n");

    const message = `*Iqbal Electronics - Sales Invoice*

Invoice No: ${selectedSO.invoiceNumber || "-"}
Date: ${format(new Date(selectedSO.saleDate), "dd/MM/yyyy")}
Customer: ${selectedSO.customer?.name || "-"}

*Items:*
${lineItemsText}

*Total: ${formatCurrency(selectedSO.totalKwd)} KWD*

Thank you for your business!`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            All Sales Invoices
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
              data-testid="input-search-sales"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total KWD</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No sales invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((so) => (
                    <TableRow key={so.id} data-testid={`row-sale-${so.id}`}>
                      <TableCell>
                        {format(new Date(so.saleDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {so.invoiceNumber ? (
                          <button
                            type="button"
                            onClick={() => setSelectedSO(so)}
                            className="text-primary hover:underline font-medium cursor-pointer"
                            data-testid={`link-invoice-${so.id}`}
                          >
                            {so.invoiceNumber}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{so.customer?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {so.lineItems.length} items
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(so.totalKwd)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedSO(so)}
                            data-testid={`button-view-sale-${so.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(so)}
                            data-testid={`button-edit-sale-${so.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(so.id)}
                            data-testid={`button-delete-sale-${so.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, totalOrders)} of {totalOrders} invoices
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
        </CardContent>
      </Card>

      <Dialog open={!!selectedSO} onOpenChange={() => setSelectedSO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Sales Invoice Details
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintInvoice}
                data-testid="button-print-invoice"
              >
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
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
                onClick={handleWhatsAppShare}
                className="text-green-600 hover:text-green-700"
                data-testid="button-whatsapp-share"
              >
                <SiWhatsapp className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </DialogHeader>
          {selectedSO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {format(new Date(selectedSO.saleDate), "dd/MM/yyyy")}
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice #:</span>{" "}
                  {selectedSO.invoiceNumber || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  {selectedSO.customer?.name || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Total KWD:</span>{" "}
                  <span className="font-medium">{formatCurrency(selectedSO.totalKwd)}</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Line Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead>IMEI Numbers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSO.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.priceKwd)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.imeiNumbers?.length ? item.imeiNumbers.join(", ") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSO} onOpenChange={() => setEditSO(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Sales Invoice
            </DialogTitle>
          </DialogHeader>
          {editSO && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    data-testid="input-edit-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice #</Label>
                  <Input
                    value={editInvoiceNumber}
                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                    placeholder="Invoice number"
                    data-testid="input-edit-invoice"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={editCustomerId} onValueChange={setEditCustomerId}>
                    <SelectTrigger data-testid="select-edit-customer">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEditLineItem}
                    data-testid="button-add-edit-line"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {editLineItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                      <div className="flex-1 min-w-[140px]">
                        <Select
                          value={item.itemName || "none"}
                          onValueChange={(val) => updateEditLineItem(item.id, "itemName", val === "none" ? "" : val)}
                        >
                          <SelectTrigger data-testid={`select-edit-item-${index}`}>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Select --</SelectItem>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.name}>
                                {i.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity || ""}
                          onChange={(e) => updateEditLineItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                          placeholder="Qty"
                          data-testid={`input-edit-qty-${index}`}
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          step="0.001"
                          value={item.priceKwd || ""}
                          onChange={(e) => updateEditLineItem(item.id, "priceKwd", e.target.value)}
                          placeholder="Price"
                          data-testid={`input-edit-price-${index}`}
                        />
                      </div>
                      <div className="w-24 text-right text-sm font-medium">
                        {(item.quantity * parseFloat(item.priceKwd || "0")).toFixed(3)}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeEditLineItem(item.id)}
                        disabled={editLineItems.length <= 1}
                        data-testid={`button-remove-edit-line-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="text-right font-medium pt-2 border-t">
                  Total: {editLineItems.reduce((sum, item) => sum + (item.quantity * parseFloat(item.priceKwd || "0")), 0).toFixed(3)} KWD
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditSO(null)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button onClick={handleEditSubmit} disabled={updateMutation.isPending} data-testid="button-save-edit">
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this sales invoice and all its line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  setDeleteId(null);
                  requestPasswordConfirmation(() => deleteMutation.mutate(deleteId));
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {PasswordDialog}
    </div>
  );
}
