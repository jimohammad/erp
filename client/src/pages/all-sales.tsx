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
import { Loader2, Search, Eye, Trash2, Receipt, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

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
  totalAmount: string;
  customer: { id: number; name: string } | null;
  lineItems: SalesOrderLineItem[];
  createdAt: string | null;
}

export default function AllSalesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: salesOrders = [], isLoading } = useQuery<SalesOrder[]>({
    queryKey: ["/api/sales-orders"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/sales-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      toast({ title: "Sales invoice deleted successfully" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
                        {formatCurrency(so.totalAmount)}
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
        </CardContent>
      </Card>

      <Dialog open={!!selectedSO} onOpenChange={() => setSelectedSO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Sales Invoice Details
            </DialogTitle>
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
                  <span className="font-medium">{formatCurrency(selectedSO.totalAmount)}</span>
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
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
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
    </div>
  );
}
