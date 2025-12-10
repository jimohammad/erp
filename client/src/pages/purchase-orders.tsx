import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Search, Eye, Trash2, FileText, Plus, Send, Package, ArrowRightLeft, Pencil } from "lucide-react";
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

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderDraft | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrderDraft | null>(null);
  const [convertDialogPO, setConvertDialogPO] = useState<PurchaseOrderDraft | null>(null);
  const [convertInvoiceNumber, setConvertInvoiceNumber] = useState("");
  const [convertGrnDate, setConvertGrnDate] = useState("");

  const { data: purchaseOrderDrafts = [], isLoading } = useQuery<PurchaseOrderDraft[]>({
    queryKey: ["/api/purchase-order-drafts", statusFilter !== "all" ? { status: statusFilter } : {}],
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showForm || editingPO) {
    return (
      <PODraftForm
        editingPO={editingPO}
        onClose={() => {
          setShowForm(false);
          setEditingPO(null);
        }}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase Orders
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
            <Button onClick={() => setShowForm(true)} data-testid="button-new-po">
              <Plus className="h-4 w-4 mr-2" />
              New PO
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total KWD</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((po) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Order Details
            </DialogTitle>
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
