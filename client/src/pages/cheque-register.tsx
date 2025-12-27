import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, CheckCircle, XCircle, Ban, Clock, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ChequePayment {
  id: number;
  paymentId: number;
  chequeNumber: string;
  bankName: string;
  chequeDate: string;
  drawerName: string | null;
  status: "pending" | "cleared" | "bounced" | "cancelled";
  clearDate: string | null;
  bounceDate: string | null;
  bounceReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payment?: {
    id: number;
    amount: string;
    paymentDate: string;
    direction: string;
    customer?: { id: number; name: string } | null;
    supplier?: { id: number; name: string } | null;
  };
}

export default function ChequeRegister() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    cheque: ChequePayment | null;
    action: "clear" | "bounce" | "cancel" | null;
  }>({ open: false, cheque: null, action: null });
  const [bounceReason, setBounceReason] = useState("");

  const { data: cheques = [], isLoading } = useQuery<ChequePayment[]>({
    queryKey: ["/api/cheques", statusFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const url = `/api/cheques${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cheques");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, bounceReason }: { id: number; status: string; bounceReason?: string }) => {
      const body: Record<string, unknown> = { status };
      if (bounceReason) body.bounceReason = bounceReason;
      return await apiRequest("PUT", `/api/cheques/${id}/status`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/cheques") });
      toast({ title: "Cheque status updated successfully" });
      setActionDialog({ open: false, cheque: null, action: null });
      setBounceReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update cheque status", description: error.message, variant: "destructive" });
    },
  });

  const handleAction = (cheque: ChequePayment, action: "clear" | "bounce" | "cancel") => {
    setActionDialog({ open: true, cheque, action });
    setBounceReason("");
  };

  const confirmAction = () => {
    if (!actionDialog.cheque || !actionDialog.action) return;
    
    updateStatusMutation.mutate({
      id: actionDialog.cheque.id,
      status: actionDialog.action === "clear" ? "cleared" : actionDialog.action === "bounce" ? "bounced" : "cancelled",
      bounceReason: actionDialog.action === "bounce" ? bounceReason : undefined,
    });
  };

  const filteredCheques = cheques.filter((cheque) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      searchTerm === "" ||
      cheque.chequeNumber.toLowerCase().includes(searchLower) ||
      cheque.bankName.toLowerCase().includes(searchLower) ||
      (cheque.drawerName?.toLowerCase() ?? "").includes(searchLower) ||
      (cheque.payment?.customer?.name?.toLowerCase() ?? "").includes(searchLower) ||
      (cheque.payment?.supplier?.name?.toLowerCase() ?? "").includes(searchLower)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "cleared":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Cleared</Badge>;
      case "bounced":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="h-3 w-3 mr-1" />Bounced</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"><Ban className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPartyName = (cheque: ChequePayment) => {
    if (cheque.payment?.customer) return cheque.payment.customer.name;
    if (cheque.payment?.supplier) return cheque.payment.supplier.name;
    return "-";
  };

  const stats = {
    total: cheques.length,
    pending: cheques.filter(c => c.status === "pending").length,
    cleared: cheques.filter(c => c.status === "cleared").length,
    bounced: cheques.filter(c => c.status === "bounced").length,
    pendingAmount: cheques.filter(c => c.status === "pending").reduce((sum, c) => sum + parseFloat(c.payment?.amount || "0"), 0),
    clearedAmount: cheques.filter(c => c.status === "cleared").reduce((sum, c) => sum + parseFloat(c.payment?.amount || "0"), 0),
    bouncedAmount: cheques.filter(c => c.status === "bounced").reduce((sum, c) => sum + parseFloat(c.payment?.amount || "0"), 0),
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Cheque Register</h1>
          <p className="text-muted-foreground">Track and manage cheque payments</p>
        </div>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/cheques") })}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-pending-count">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">KWD {formatCurrency(stats.pendingAmount)}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cleared</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-cleared-count">{stats.cleared}</p>
                <p className="text-sm text-muted-foreground">KWD {formatCurrency(stats.clearedAmount)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bounced</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-bounced-count">{stats.bounced}</p>
                <p className="text-sm text-muted-foreground">KWD {formatCurrency(stats.bouncedAmount)}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cheques</p>
                <p className="text-2xl font-bold" data-testid="text-total-count">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Cheques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cheques..."
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cheque List ({filteredCheques.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCheques.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cheques found
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cheque #</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Cheque Date</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Drawer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCheques.map((cheque) => (
                    <TableRow key={cheque.id} data-testid={`row-cheque-${cheque.id}`}>
                      <TableCell className="font-medium">{cheque.chequeNumber}</TableCell>
                      <TableCell>{cheque.bankName}</TableCell>
                      <TableCell>{formatDate(cheque.chequeDate)}</TableCell>
                      <TableCell>{getPartyName(cheque)}</TableCell>
                      <TableCell>{cheque.drawerName || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        KWD {formatCurrency(cheque.payment?.amount || "0")}
                      </TableCell>
                      <TableCell>{getStatusBadge(cheque.status)}</TableCell>
                      <TableCell>
                        {cheque.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleAction(cheque, "clear")}
                              data-testid={`button-clear-${cheque.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleAction(cheque, "bounce")}
                              data-testid={`button-bounce-${cheque.id}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-700"
                              onClick={() => handleAction(cheque, "cancel")}
                              data-testid={`button-cancel-${cheque.id}`}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {cheque.status === "bounced" && cheque.bounceReason && (
                          <span className="text-xs text-red-600" title={cheque.bounceReason}>
                            {cheque.bounceReason.slice(0, 20)}...
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "clear" && "Clear Cheque"}
              {actionDialog.action === "bounce" && "Mark Cheque as Bounced"}
              {actionDialog.action === "cancel" && "Cancel Cheque"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "clear" && "Confirm that this cheque has been cleared by the bank."}
              {actionDialog.action === "bounce" && "Mark this cheque as bounced and provide a reason."}
              {actionDialog.action === "cancel" && "Cancel this cheque payment. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.cheque && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Cheque Number:</div>
                <div className="font-medium">{actionDialog.cheque.chequeNumber}</div>
                <div className="text-muted-foreground">Bank:</div>
                <div className="font-medium">{actionDialog.cheque.bankName}</div>
                <div className="text-muted-foreground">Amount:</div>
                <div className="font-medium">KWD {formatCurrency(actionDialog.cheque.payment?.amount || "0")}</div>
                <div className="text-muted-foreground">Party:</div>
                <div className="font-medium">{getPartyName(actionDialog.cheque)}</div>
              </div>

              {actionDialog.action === "bounce" && (
                <div className="space-y-2">
                  <Label>Bounce Reason</Label>
                  <Input
                    value={bounceReason}
                    onChange={(e) => setBounceReason(e.target.value)}
                    placeholder="Enter reason for bounced cheque"
                    data-testid="input-bounce-reason"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, cheque: null, action: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updateStatusMutation.isPending || (actionDialog.action === "bounce" && !bounceReason.trim())}
              variant={actionDialog.action === "clear" ? "default" : "destructive"}
              data-testid="button-confirm-action"
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {actionDialog.action === "clear" && "Confirm Clear"}
                  {actionDialog.action === "bounce" && "Mark as Bounced"}
                  {actionDialog.action === "cancel" && "Cancel Cheque"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
