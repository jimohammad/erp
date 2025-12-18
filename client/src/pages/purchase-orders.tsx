import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { PaymentWithDetails } from "@shared/schema";
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
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Eye, Trash2, FileText, Send, Package, ArrowRightLeft, Pencil, Printer, ChevronDown, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@shared/schema";
import { format } from "date-fns";
import PODraftForm from "@/components/PODraftForm";

interface PODraftLineItem {
  id: number;
  itemName: string;
  quantity: number;
  priceKwd: string | null;
  fxPrice: string | null;
  totalKwd: string | null;
}

interface PurchaseOrderDraft {
  id: number;
  poNumber: string;
  poDate: string;
  status: string;
  supplierId: number | null;
  supplier: { id: number; name: string } | null;
  totalKwd: string;
  fxCurrency: string | null;
  fxRate: string | null;
  totalFx: string | null;
  notes: string | null;
  invoiceFilePath: string | null;
  deliveryNoteFilePath: string | null;
  ttCopyFilePath: string | null;
  lineItems: PODraftLineItem[];
  createdAt: string | null;
  convertedToPurchaseId: number | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "received", label: "Received" },
  { value: "converted", label: "Converted" },
];

const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "draft":
      return "secondary";
    case "sent":
      return "outline";
    case "received":
      return "default";
    case "converted":
      return "destructive";
    default:
      return "secondary";
  }
};

const formatDateForPrint = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
};

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderDraft | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrderDraft | null>(null);
  const [convertDialogPO, setConvertDialogPO] = useState<PurchaseOrderDraft | null>(null);
  const [convertInvoiceNumber, setConvertInvoiceNumber] = useState("");
  const [convertGrnDate, setConvertGrnDate] = useState("");

  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });
  
  const userPrinterType = userData?.printerType || "a5";

  const updatePrinterMutation = useMutation({
    mutationFn: async (printerType: string) => {
      return apiRequest("PUT", "/api/auth/user/printer-type", { printerType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (currentBranch?.id) params.set("branchId", currentBranch.id.toString());
    const queryString = params.toString();
    return queryString ? `/api/purchase-order-drafts?${queryString}` : "/api/purchase-order-drafts";
  };

  const { data: purchaseOrderDrafts = [], isLoading } = useQuery<PurchaseOrderDraft[]>({
    queryKey: ["/api/purchase-order-drafts", { status: statusFilter, branchId: currentBranch?.id }],
    queryFn: async () => {
      const res = await fetch(buildQueryUrl(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchase order drafts");
      return res.json();
    },
  });

  const { data: paymentsData } = useQuery<{ data: PaymentWithDetails[]; total: number }>({
    queryKey: ["/api/payments", "po-status"],
    queryFn: async () => {
      const res = await fetch(`/api/payments?limit=10000`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  const paidPurchaseOrderIds = useMemo(() => {
    const payments = paymentsData?.data ?? [];
    const paidIds = new Set<number>();
    payments.forEach(p => {
      if (p.purchaseOrderId) {
        paidIds.add(p.purchaseOrderId);
      }
    });
    return paidIds;
  }, [paymentsData]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/purchase-order-drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-order-drafts"] });
      toast({ title: "Purchase order deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/purchase-order-drafts/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-order-drafts"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async ({ id, invoiceNumber, grnDate }: { id: number; invoiceNumber: string; grnDate: string }) => {
      return await apiRequest("POST", `/api/purchase-order-drafts/${id}/convert`, { invoiceNumber, grnDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-order-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({ title: "Purchase order converted to bill successfully" });
      setConvertDialogPO(null);
      setConvertInvoiceNumber("");
      setConvertGrnDate("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to convert", description: error.message, variant: "destructive" });
    },
  });

  const filteredOrders = purchaseOrderDrafts.filter((po) => {
    const query = searchQuery.toLowerCase();
    return (
      po.poNumber?.toLowerCase().includes(query) ||
      po.supplier?.name.toLowerCase().includes(query) ||
      po.lineItems.some(item => item.itemName.toLowerCase().includes(query))
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

  const handleOpenConvert = (po: PurchaseOrderDraft) => {
    setConvertDialogPO(po);
    setConvertInvoiceNumber(po.poNumber);
    setConvertGrnDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleConvert = () => {
    if (convertDialogPO) {
      convertMutation.mutate({
        id: convertDialogPO.id,
        invoiceNumber: convertInvoiceNumber,
        grnDate: convertGrnDate,
      });
    }
  };

  const printThermal = (po: PurchaseOrderDraft) => {
    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) return;
    
    const itemsHtml = po.lineItems.map(li => `
      <tr>
        <td style="text-align:left;padding:2px 0;">${li.itemName}</td>
        <td style="text-align:center;padding:2px 0;">${li.quantity}</td>
        <td style="text-align:right;padding:2px 0;">${parseFloat(li.priceKwd || "0").toFixed(3)}</td>
        <td style="text-align:right;padding:2px 0;">${li.totalKwd || "0.000"}</td>
      </tr>
    `).join("");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order ${po.poNumber}</title>
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
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">Iqbal Electronics Co. WLL</div>
          <div style="font-size:11px;">PURCHASE ORDER</div>
        </div>
        <div class="divider"></div>
        <div class="info-row"><span>PO #:</span><span>${po.poNumber}</span></div>
        <div class="info-row"><span>Date:</span><span>${formatDateForPrint(po.poDate)}</span></div>
        <div class="info-row"><span>Supplier:</span><span>${po.supplier?.name || "-"}</span></div>
        <div class="info-row"><span>Status:</span><span>${po.status.toUpperCase()}</span></div>
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
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="divider"></div>
        <div class="totals">
          <div class="row total-row"><span>Total KWD:</span><span>${formatCurrency(po.totalKwd)}</span></div>
          ${po.fxCurrency && po.totalFx ? `<div class="row"><span>Total ${po.fxCurrency}:</span><span>${formatCurrency(po.totalFx)}</span></div>` : ""}
        </div>
        ${po.notes ? `<div class="divider"></div><div style="font-size:10px;"><b>Notes:</b> ${po.notes}</div>` : ""}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printA5 = (po: PurchaseOrderDraft) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalQuantity = po.lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order ${po.poNumber} - Iqbal Electronics</title>
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
              max-width: 560px;
              margin: 0 auto;
              padding: 15px 20px;
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
              font-size: 14px;
              color: #333;
              margin-top: 3px;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .info-box { flex: 1; }
            .info-box.right { text-align: right; }
            .info-row { margin: 5px 0; }
            .info-label { color: #666; font-size: 11px; }
            .info-value { font-weight: 500; font-size: 13px; }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th {
              border: 1px solid #000;
              padding: 10px 8px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .items-table td {
              padding: 10px 8px;
              border: 1px solid #000;
              font-size: 12px;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-top: 20px;
            }
            .totals-box {
              width: 250px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .totals-row.total {
              font-weight: 600;
              font-size: 14px;
              border: 1px solid #000;
              padding: 10px;
              margin-top: 5px;
            }
            .notes-section {
              margin-top: 20px;
              padding: 10px;
              border: 1px solid #000;
              border-radius: 5px;
            }
            @media print {
              @page { size: A5; margin: 8mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="top-title">
              <h1>PURCHASE ORDER</h1>
            </div>
            
            <div class="header-row">
              <div class="logo-section">
                <div class="iec-text">IEC</div>
              </div>
              <div class="company-section">
                <div class="company-name">Iqbal Electronics Co. WLL</div>
                <div class="phone">Tel: +965 22424240</div>
              </div>
            </div>
            
            <div class="info-section">
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">TO:</span>
                  <span class="info-value">${po.supplier?.name || "-"}</span>
                </div>
              </div>
              <div class="info-box right">
                <div class="info-row">
                  <span class="info-label">PO Number:</span>
                  <span class="info-value">${po.poNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Date:</span>
                  <span class="info-value">${formatDateForPrint(po.poDate)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">${po.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width:50px;">#</th>
                  <th style="text-align:left;">Description</th>
                  <th style="width:80px;" class="text-center">Qty</th>
                  <th style="width:100px;" class="text-right">Unit Price</th>
                  <th style="width:100px;" class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${po.lineItems.map((item, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td>${item.itemName}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(item.priceKwd)}</td>
                    <td class="text-right">${formatCurrency(item.totalKwd)}</td>
                  </tr>
                `).join("")}
                <tr style="font-weight:500;border-top:2px solid #000;">
                  <td></td>
                  <td style="text-align:right;">Total Items: ${po.lineItems.length}</td>
                  <td class="text-center">${totalQuantity}</td>
                  <td></td>
                  <td class="text-right">${formatCurrency(po.totalKwd)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="totals-section">
              <div class="totals-box">
                <div class="totals-row total">
                  <span>Total KWD</span>
                  <span>${formatCurrency(po.totalKwd)}</span>
                </div>
                ${po.fxCurrency && po.totalFx ? `
                  <div class="totals-row">
                    <span>Total ${po.fxCurrency}</span>
                    <span>${formatCurrency(po.totalFx)}</span>
                  </div>
                ` : ""}
              </div>
            </div>
            
            ${po.notes ? `
              <div class="notes-section">
                <strong>Notes:</strong> ${po.notes}
              </div>
            ` : ""}
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrint = (po: PurchaseOrderDraft, format?: string) => {
    const printerFormat = format || userPrinterType;
    if (format && format !== userPrinterType) {
      updatePrinterMutation.mutate(format);
    }
    if (printerFormat === "thermal") {
      printThermal(po);
    } else {
      printA5(po);
    }
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
      <PODraftForm
        editingPO={editingPO}
        onEditComplete={() => setEditingPO(null)}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase Orders List
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-po"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-580px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total KWD</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((po) => {
                    const isPaid = po.convertedToPurchaseId ? paidPurchaseOrderIds.has(po.convertedToPurchaseId) : false;
                    return (
                    <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>
                        {format(new Date(po.poDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{po.supplier?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {po.lineItems.length} items
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(po.totalKwd)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(po.status)} className="capitalize">
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {po.status === "converted" ? (
                          isPaid ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" data-testid={`badge-paid-${po.id}`}>
                              Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" data-testid={`badge-unpaid-${po.id}`}>
                              Unpaid
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedPO(po)}
                            data-testid={`button-view-po-${po.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {po.status !== "converted" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingPO(po)}
                                data-testid={`button-edit-po-${po.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {po.status === "draft" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => updateStatusMutation.mutate({ id: po.id, status: "sent" })}
                                  title="Mark as Sent"
                                  data-testid={`button-send-po-${po.id}`}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              {po.status === "sent" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => updateStatusMutation.mutate({ id: po.id, status: "received" })}
                                  title="Mark as Received"
                                  data-testid={`button-receive-po-${po.id}`}
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                              )}
                              {(po.status === "received" || po.status === "sent" || po.status === "draft") && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleOpenConvert(po)}
                                  title="Convert to Bill"
                                  data-testid={`button-convert-po-${po.id}`}
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteId(po.id)}
                                data-testid={`button-delete-po-${po.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Order Details
            </DialogTitle>
            {selectedPO && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(selectedPO)}
                  data-testid="button-print-default"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="button-print-menu">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handlePrint(selectedPO, "a5")}
                      data-testid="menu-print-a5"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      A5
                      {userPrinterType === "a5" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePrint(selectedPO, "thermal")}
                      data-testid="menu-print-thermal"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Thermal 80mm
                      {userPrinterType === "thermal" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">PO Number:</span>{" "}
                  <span className="font-medium">{selectedPO.poNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {format(new Date(selectedPO.poDate), "dd/MM/yyyy")}
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier:</span>{" "}
                  {selectedPO.supplier?.name || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant={getStatusVariant(selectedPO.status)} className="capitalize">
                    {selectedPO.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Total KWD:</span>{" "}
                  <span className="font-medium">{formatCurrency(selectedPO.totalKwd)}</span>
                </div>
                {selectedPO.fxCurrency && (
                  <div>
                    <span className="text-muted-foreground">Total {selectedPO.fxCurrency}:</span>{" "}
                    <span className="font-medium">{formatCurrency(selectedPO.totalFx)}</span>
                  </div>
                )}
              </div>
              {selectedPO.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  {selectedPO.notes}
                </div>
              )}
              {(selectedPO.invoiceFilePath || selectedPO.deliveryNoteFilePath || selectedPO.ttCopyFilePath) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Documents</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPO.invoiceFilePath && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        data-testid="button-view-invoice"
                      >
                        <a href={selectedPO.invoiceFilePath} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-1" />
                          Invoice
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {selectedPO.deliveryNoteFilePath && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        data-testid="button-view-delivery-note"
                      >
                        <a href={selectedPO.deliveryNoteFilePath} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-1" />
                          Delivery Note
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {selectedPO.ttCopyFilePath && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        data-testid="button-view-tt-copy"
                      >
                        <a href={selectedPO.ttCopyFilePath} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-1" />
                          TT Copy
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Line Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price KWD</TableHead>
                      <TableHead className="text-right">Total KWD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.priceKwd)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalKwd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!convertDialogPO} onOpenChange={() => setConvertDialogPO(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Purchase Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Converting this PO will create a new purchase bill and add the items to your inventory.
            </p>
            <div className="space-y-2">
              <Label htmlFor="invoice-number">Invoice Number</Label>
              <Input
                id="invoice-number"
                value={convertInvoiceNumber}
                onChange={(e) => setConvertInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                data-testid="input-convert-invoice"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grn-date">GRN Date</Label>
              <Input
                id="grn-date"
                type="date"
                value={convertGrnDate}
                onChange={(e) => setConvertGrnDate(e.target.value)}
                data-testid="input-convert-grn-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogPO(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={convertMutation.isPending}
              data-testid="button-confirm-convert"
            >
              {convertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Convert to Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The purchase order will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
