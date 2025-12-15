import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import companyLogoUrl from "@/assets/company-logo.jpg";
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
import { Loader2, Search, Eye, Trash2, Receipt, ShoppingBag, ChevronLeft, ChevronRight, Printer, FileDown } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { format } from "date-fns";
import { usePasswordProtection } from "@/components/PasswordConfirmDialog";

const PAGE_SIZE = 50;

interface SalesOrderLineItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
  imeiNumbers: string[] | null;
}

interface SalesOrder {
  id: number;
  saleDate: string;
  invoiceNumber: string | null;
  totalKwd: string | null;
  customer: { id: number; name: string } | null;
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/sales-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/sales-orders');
        }
      });
      toast({ title: "Sales invoice deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      setDeleteId(null);
    },
  });

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

  const handlePrintInvoice = () => {
    if (!selectedSO) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const lineItemsHtml = selectedSO.lineItems.map(item => `
      <div class="item-row">
        <div class="item-name">${escapeHtml(item.itemName)}</div>
        <div class="item-details">${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(parseFloat(item.unitPrice || "0") * item.quantity)}</div>
        ${item.imeiNumbers?.length ? `<div class="item-imei">IMEI: ${item.imeiNumbers.map(imei => escapeHtml(imei)).join(", ")}</div>` : ""}
      </div>
    `).join("");

    const invoiceAmount = parseFloat(selectedSO.totalKwd || "0");

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
              background: #000;
              color: #fff;
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
              ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; margin-bottom: 2mm;" alt="IEC" />` : `<div class="company-name">Iqbal Electronics Co.</div><div class="company-sub">WLL</div>`}
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
              <div class="total-label">Total Amount</div>
              <div class="total-value">${invoiceAmount.toFixed(3)} KWD</div>
            </div>
            
            <div class="footer">
              Thank You!
            </div>
          </div>
          
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    if (!selectedSO) return;
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) return;

    const lineItemsHtmlPdf = selectedSO.lineItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.itemName)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">${item.imeiNumbers?.length ? item.imeiNumbers.map(imei => escapeHtml(imei)).join(", ") : "-"}</td>
      </tr>
    `).join("");

    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${escapeHtml(selectedSO.invoiceNumber) || "No Number"}</title>
          <style>
            body { font-family: Inter, system-ui, sans-serif; padding: 20px; }
            .pdf-instructions { text-align: center; padding: 16px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; margin-bottom: 20px; }
            .pdf-instructions strong { display: block; font-size: 16px; margin-bottom: 8px; color: #92400e; }
            .pdf-instructions span { color: #92400e; }
            .shortcut { display: inline-block; background: #fff; border: 1px solid #d97706; padding: 4px 12px; border-radius: 4px; font-family: monospace; font-weight: 600; margin: 4px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .company { font-size: 24px; font-weight: bold; color: #0f172a; }
            .invoice-title { font-size: 14px; color: #64748b; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
            .info-item { font-size: 14px; }
            .info-label { color: #64748b; margin-right: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
            .total { font-size: 18px; font-weight: bold; text-align: right; }
            @media print { .pdf-instructions { display: none !important; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="pdf-instructions">
            <strong>Save Invoice as PDF</strong>
            <span>Press <span class="shortcut">Ctrl + P</span> (Windows) or <span class="shortcut">Cmd + P</span> (Mac)<br>
            Then select <strong>"Save as PDF"</strong> as the destination.</span>
          </div>
          <div class="header">
            <div>
              ${logoBase64 ? `<img src="${logoBase64}" style="height: 50px; width: auto;" alt="IEC" />` : `<div class="company">Iqbal Electronics</div>`}
              <div style="color: #64748b; font-size: 12px;">Kuwait</div>
            </div>
            <div style="text-align: right;">
              <div class="invoice-title">Sales Invoice</div>
              <div style="font-size: 18px; font-weight: bold;">${escapeHtml(selectedSO.invoiceNumber)}</div>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Date:</span> ${format(new Date(selectedSO.saleDate), "dd/MM/yyyy")}</div>
            <div class="info-item"><span class="info-label">Customer:</span> ${escapeHtml(selectedSO.customer?.name)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th>IMEI Numbers</th>
              </tr>
            </thead>
            <tbody>${lineItemsHtmlPdf}</tbody>
          </table>
          <div class="total">Total: ${formatCurrency(selectedSO.totalKwd)} KWD</div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
        </body>
      </html>
    `);
    pdfWindow.document.close();
  };

  const handleWhatsAppShare = () => {
    if (!selectedSO) return;
    const lineItemsText = selectedSO.lineItems.map((item, index) => 
      `${index + 1}. ${item.itemName} - Qty: ${item.quantity} - ${formatCurrency(item.unitPrice)} KWD${item.imeiNumbers?.length ? `\n   IMEI: ${item.imeiNumbers.join(", ")}` : ""}`
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
                        {so.invoiceNumber || <span className="text-muted-foreground">-</span>}
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
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
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
