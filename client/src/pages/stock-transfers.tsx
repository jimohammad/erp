import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ArrowLeftRight, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 25;
import { format } from "date-fns";

interface Branch {
  id: number;
  name: string;
  code: string | null;
}

interface StockTransferLineItem {
  id: number;
  stockTransferId: number;
  itemName: string;
  quantity: number | null;
  priceKwd: string | null;
  imeiNumbers: string[] | null;
}

interface StockTransfer {
  id: number;
  transferDate: string;
  transferNumber: string | null;
  fromBranchId: number;
  toBranchId: number;
  notes: string | null;
  fromBranch: Branch;
  toBranch: Branch;
  lineItems: StockTransferLineItem[];
}

export default function StockTransfersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { currentBranchId } = useBranch();
  const [page, setPage] = useState(1);

  const { data: allTransfers = [], isLoading } = useQuery<StockTransfer[]>({
    queryKey: ["/api/stock-transfers"],
  });

  const transfers = currentBranchId
    ? allTransfers.filter(
        (t) => t.fromBranchId === currentBranchId || t.toBranchId === currentBranchId
      )
    : allTransfers;

  const totalPages = Math.ceil(transfers.length / PAGE_SIZE);
  const paginatedTransfers = transfers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/stock-transfers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      toast({ title: "Stock transfer deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete transfer", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-end">
        <Button onClick={() => setLocation("/stock-transfers/new")} data-testid="button-new-transfer">
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Transfer History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock transfers found. Click "New Transfer" to create one.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transfer #</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransfers.map((transfer) => (
                      <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                        <TableCell>{format(new Date(transfer.transferDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>{transfer.transferNumber || "-"}</TableCell>
                        <TableCell>{transfer.fromBranch.name}</TableCell>
                        <TableCell>{transfer.toBranch.name}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {transfer.lineItems.map((li) => `${li.itemName} (${li.quantity})`).join(", ")}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{transfer.notes || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this transfer?")) {
                                deleteMutation.mutate(transfer.id);
                              }
                            }}
                            data-testid={`button-delete-transfer-${transfer.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, transfers.length)} of {transfers.length} transfers
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-transfers-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      data-testid="button-transfers-next-page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
