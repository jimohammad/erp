import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, ChevronLeft, ChevronRight, List, Filter, X, ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useLocation } from "wouter";
import type { AllTransaction, Branch, Supplier } from "@shared/schema";

const PAGE_SIZE = 50;

const MODULE_LABELS: Record<string, string> = {
  sales: "Sale",
  purchase: "Purchase",
  payment_in: "Payment IN",
  payment_out: "Payment OUT",
  sale_return: "Sale Return",
  purchase_return: "Purchase Return",
  expense: "Expense",
  discount: "Discount",
};

const MODULE_COLORS: Record<string, string> = {
  sales: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  purchase: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  payment_in: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  payment_out: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  sale_return: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  purchase_return: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  expense: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  discount: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100",
};

// Map module types to their respective page routes
const MODULE_ROUTES: Record<string, string> = {
  sales: "/sales",
  purchase: "/purchase-orders",
  payment_in: "/payments",
  payment_out: "/payments",
  sale_return: "/returns",
  purchase_return: "/returns",
  expense: "/expenses",
  discount: "/discount",
};

export default function AllTransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AllTransaction | null>(null);
  const [, navigate] = useLocation();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("limit", PAGE_SIZE.toString());
    params.set("offset", ((page - 1) * PAGE_SIZE).toString());
    
    if (searchQuery) params.set("search", searchQuery);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (selectedModule && selectedModule !== "all") params.set("modules", selectedModule);
    if (selectedBranch && selectedBranch !== "all") params.set("branchId", selectedBranch);
    if (selectedParty && selectedParty !== "all") params.set("partyId", selectedParty);
    
    return params.toString();
  };

  const { data: transactionsData, isLoading } = useQuery<{ data: AllTransaction[]; total: number }>({
    queryKey: [`/api/transactions?${buildQueryString()}`],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: parties } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const transactions = transactionsData?.data ?? [];
  const totalTransactions = transactionsData?.total ?? 0;
  const totalPages = Math.ceil(totalTransactions / PAGE_SIZE);

  const clearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedModule("all");
    setSelectedBranch("all");
    setSelectedParty("all");
    setPage(1);
  };

  const hasActiveFilters = searchQuery || startDate || endDate || 
    (selectedModule && selectedModule !== "all") || 
    (selectedBranch && selectedBranch !== "all") || 
    (selectedParty && selectedParty !== "all");

  const formatCurrency = (amount: string | null, currency?: string | null) => {
    if (!amount) return "-";
    const num = parseFloat(amount);
    if (currency && currency !== "KWD") {
      return `${num.toFixed(2)} ${currency}`;
    }
    return `${num.toFixed(3)} KWD`;
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            All Transactions
            <Badge variant="secondary" className="ml-2">
              {totalTransactions.toLocaleString()}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, party, notes..."
                className="pl-8 w-64"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                data-testid="input-search-transactions"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        {showFilters && (
          <div className="px-6 pb-4 flex flex-wrap items-end gap-4 border-b">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-40"
                data-testid="input-start-date"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-40"
                data-testid="input-end-date"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-muted-foreground">Type</Label>
              <Select value={selectedModule} onValueChange={(v) => { setSelectedModule(v); setPage(1); }}>
                <SelectTrigger className="w-40" data-testid="select-module">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="purchase">Purchases</SelectItem>
                  <SelectItem value="payment_in">Payment IN</SelectItem>
                  <SelectItem value="payment_out">Payment OUT</SelectItem>
                  <SelectItem value="sale_return">Sale Returns</SelectItem>
                  <SelectItem value="purchase_return">Purchase Returns</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="discount">Discounts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-muted-foreground">Branch</Label>
              <Select value={selectedBranch} onValueChange={(v) => { setSelectedBranch(v); setPage(1); }}>
                <SelectTrigger className="w-40" data-testid="select-branch">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm text-muted-foreground">Party</Label>
              <Select value={selectedParty} onValueChange={(v) => { setSelectedParty(v); setPage(1); }}>
                <SelectTrigger className="w-48" data-testid="select-party">
                  <SelectValue placeholder="All Parties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  {parties?.map((party) => (
                    <SelectItem key={party.id} value={party.id.toString()}>
                      {party.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <CardContent className="flex-1 overflow-hidden p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <List className="h-12 w-12 mb-2 opacity-50" />
              <p>No transactions found</p>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background z-10">Date</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10">Type</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10">Reference</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10">Party</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10">Branch</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right">Amount (KWD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow 
                      key={tx.id} 
                      data-testid={`row-transaction-${tx.id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedTransaction(tx)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {tx.transactionDate ? format(new Date(tx.transactionDate), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${MODULE_COLORS[tx.module] || "bg-gray-100 text-gray-800"} no-default-hover-elevate no-default-active-elevate`}>
                          {MODULE_LABELS[tx.module] || tx.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {tx.reference}
                      </TableCell>
                      <TableCell>
                        {tx.partyName || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {tx.branchName || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(tx.amountKwd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, totalTransactions)} of {totalTransactions.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Transaction Details
              {selectedTransaction && (
                <Badge className={`${MODULE_COLORS[selectedTransaction.module] || "bg-gray-100 text-gray-800"} no-default-hover-elevate no-default-active-elevate`}>
                  {MODULE_LABELS[selectedTransaction.module] || selectedTransaction.module}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Reference</Label>
                  <p className="font-mono text-sm font-medium">{selectedTransaction.reference}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Date</Label>
                  <p className="text-sm font-medium">
                    {selectedTransaction.transactionDate 
                      ? format(new Date(selectedTransaction.transactionDate), "dd/MM/yyyy") 
                      : "-"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Party</Label>
                  <p className="text-sm font-medium">{selectedTransaction.partyName || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Branch</Label>
                  <p className="text-sm font-medium">{selectedTransaction.branchName || "-"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Amount (KWD)</Label>
                  <p className="text-lg font-bold font-mono">{formatCurrency(selectedTransaction.amountKwd)}</p>
                </div>
                {selectedTransaction.amountFx && selectedTransaction.fxCurrency && (
                  <div>
                    <Label className="text-sm text-muted-foreground">FX Amount</Label>
                    <p className="text-lg font-bold font-mono">
                      {parseFloat(selectedTransaction.amountFx).toFixed(2)} {selectedTransaction.fxCurrency}
                    </p>
                  </div>
                )}
              </div>

              {selectedTransaction.notes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm text-muted-foreground">Notes</Label>
                    <p className="text-sm">{selectedTransaction.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTransaction(null)}
                  data-testid="button-close-transaction"
                >
                  Close
                </Button>
                {MODULE_ROUTES[selectedTransaction.module] && (
                  <Button
                    onClick={() => {
                      navigate(MODULE_ROUTES[selectedTransaction.module]);
                      setSelectedTransaction(null);
                    }}
                    data-testid="button-go-to-module"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Go to {MODULE_LABELS[selectedTransaction.module]}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
