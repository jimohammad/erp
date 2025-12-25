import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
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
import { Loader2, Search, Eye, Trash2, FileText, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { usePasswordProtection } from "@/components/PasswordConfirmDialog";

const PAGE_SIZE = 25;

interface PurchaseOrderLineItem {
  id: number;
  itemName: string;
  quantity: number;
  priceKwd: string | null;
  priceFx: string | null;
  imeiNumbers: string[] | null;
}

interface PurchaseOrder {
  id: number;
  purchaseDate: string;
  invoiceNumber: string | null;
  totalKwd: string;
  fxCurrency: string | null;
  totalFx: string | null;
  grnDate: string | null;
  supplier: { id: number; name: string } | null;
  lineItems: PurchaseOrderLineItem[];
  createdAt: string | null;
}

export default function AllPurchasesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const { requestPasswordConfirmation, PasswordDialog } = usePasswordProtection();
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const viewId = new URLSearchParams(searchParams).get("viewId");
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const { data: purchaseData, isLoading } = useQuery<{ data: PurchaseOrder[]; total: number }>({
    queryKey: ["/api/purchase-orders", { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }],
  });
  
  const purchaseOrders = purchaseData?.data ?? [];
  const totalOrders = purchaseData?.total ?? 0;
  const totalPages = Math.ceil(totalOrders / PAGE_SIZE);

  // Fetch specific order when viewId is present
  const viewIdNum = viewId ? parseInt(viewId) : null;
  const { data: viewIdOrder } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", viewIdNum],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${viewIdNum}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!viewIdNum,
  });

  // Auto-open dialog when viewId order is loaded
  useEffect(() => {
    if (viewIdOrder && viewId) {
      setSelectedPO(viewIdOrder);
      navigate("/purchase-orders", { replace: true });
    }
  }, [viewIdOrder, viewId, navigate]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({ title: "Purchase order deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const filteredOrders = purchaseOrders.filter((po) => {
    const query = searchQuery.toLowerCase();
    return (
      po.invoiceNumber?.toLowerCase().includes(query) ||
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
            <FileText className="h-5 w-5" />
            All Purchase Invoices
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
              data-testid="input-search-purchases"
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total KWD</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No purchase invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((po) => (
                    <TableRow key={po.id} data-testid={`row-purchase-${po.id}`}>
                      <TableCell>
                        {format(new Date(po.purchaseDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {po.invoiceNumber || <span className="text-muted-foreground">-</span>}
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedPO(po)}
                            data-testid={`button-view-purchase-${po.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(po.id)}
                            data-testid={`button-delete-purchase-${po.id}`}
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

      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {format(new Date(selectedPO.purchaseDate), "dd/MM/yyyy")}
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice #:</span>{" "}
                  {selectedPO.invoiceNumber || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier:</span>{" "}
                  {selectedPO.supplier?.name || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">GRN Date:</span>{" "}
                  {selectedPO.grnDate ? format(new Date(selectedPO.grnDate), "dd/MM/yyyy") : "-"}
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
              <div>
                <h4 className="font-medium mb-2">Line Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price KWD</TableHead>
                      <TableHead>IMEI Numbers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.lineItems.map((item) => (
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this purchase invoice and all its line items.
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
