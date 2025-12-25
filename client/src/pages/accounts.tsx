import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowRightLeft, Wallet, FileText, X, Plus, Pencil, Trash2, Banknote, TrendingUp, TrendingDown, MoreHorizontal, ArrowUpDown, Building2, CreditCard, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Account, AccountTransferWithDetails } from "@shared/schema";

interface AccountTransaction {
  date: string;
  description: string;
  type: string;
  amount: number;
  balance: number;
}

const transferFormSchema = z.object({
  transferDate: z.string().min(1, "Date is required"),
  fromAccountId: z.string().min(1, "From account is required"),
  toAccountId: z.string().min(1, "To account is required"),
  amount: z.string().min(1, "Amount is required"),
  notes: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

export default function AccountsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Account management state
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountName, setAccountName] = useState("");
  const [openingBalanceDialogOpen, setOpeningBalanceDialogOpen] = useState(false);
  const [openingBalanceAccount, setOpeningBalanceAccount] = useState<Account | null>(null);
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState("");
  const [openingBalanceDate, setOpeningBalanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [openingBalanceNotes, setOpeningBalanceNotes] = useState("");
  
  // Adjustment state
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentAccount, setAdjustmentAccount] = useState<Account | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"IN" | "OUT">("IN");
  const [adjustmentDate, setAdjustmentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: transfers = [] } = useQuery<AccountTransferWithDetails[]>({
    queryKey: ["/api/account-transfers"],
  });

  const transactionsQueryKey = selectedAccount 
    ? (startDate || endDate 
        ? `/api/accounts/${selectedAccount.id}/transactions?${new URLSearchParams({
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
          }).toString()}`
        : `/api/accounts/${selectedAccount.id}/transactions`)
    : null;

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<AccountTransaction[]>({
    queryKey: [transactionsQueryKey],
    enabled: !!selectedAccount,
  });

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      transferDate: format(new Date(), "yyyy-MM-dd"),
      fromAccountId: "",
      toAccountId: "",
      amount: "",
      notes: "",
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferFormValues) => {
      const payload = {
        transferDate: data.transferDate,
        fromAccountId: parseInt(data.fromAccountId),
        toAccountId: parseInt(data.toAccountId),
        amount: data.amount,
        notes: data.notes || null,
      };
      return apiRequest("POST", "/api/account-transfers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      if (selectedAccount) {
        queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      }
      setTransferDialogOpen(false);
      transferForm.reset({
        transferDate: format(new Date(), "yyyy-MM-dd"),
        fromAccountId: "",
        toAccountId: "",
        amount: "",
        notes: "",
      });
      toast({ title: "Transfer completed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Transfer failed", 
        description: error.message || "Could not complete transfer",
        variant: "destructive" 
      });
    },
  });

  const fromAccountId = transferForm.watch("fromAccountId");

  // Account management mutations
  const createAccountMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/accounts", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setAddAccountDialogOpen(false);
      setAccountName("");
      toast({ title: "Account created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create account", description: error.message, variant: "destructive" });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest("PUT", `/api/accounts/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setEditingAccount(null);
      setAccountName("");
      toast({ title: "Account updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update account", description: error.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      if (selectedAccount?.id) {
        setSelectedAccount(null);
      }
      toast({ title: "Account deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete account", description: error.message, variant: "destructive" });
    },
  });

  const addOpeningBalanceMutation = useMutation({
    mutationFn: async ({ accountId, amount, date, notes }: { accountId: number; amount: string; date: string; notes?: string }) => {
      return apiRequest("POST", `/api/accounts/${accountId}/opening-balance`, { amount, date, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          if (Array.isArray(key) && key.length > 0) {
            const firstKey = key[0];
            return typeof firstKey === 'string' && 
              firstKey.includes('/api/accounts/') && 
              firstKey.includes('/transactions');
          }
          return false;
        }
      });
      if (selectedAccount && openingBalanceAccount && selectedAccount.id === openingBalanceAccount.id) {
        queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      }
      setOpeningBalanceDialogOpen(false);
      setOpeningBalanceAccount(null);
      setOpeningBalanceAmount("");
      setOpeningBalanceNotes("");
      toast({ title: "Opening balance added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add opening balance", description: error.message, variant: "destructive" });
    },
  });

  const addAdjustmentMutation = useMutation({
    mutationFn: async ({ accountId, amount, direction, date, reason }: { 
      accountId: number; 
      amount: string; 
      direction: "IN" | "OUT"; 
      date: string; 
      reason: string 
    }) => {
      return apiRequest("POST", `/api/accounts/${accountId}/adjustment`, { amount, direction, date, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          if (Array.isArray(key) && key.length > 0) {
            const firstKey = key[0];
            return typeof firstKey === 'string' && 
              firstKey.includes('/api/accounts/') && 
              firstKey.includes('/transactions');
          }
          return false;
        }
      });
      setAdjustmentDialogOpen(false);
      setAdjustmentAccount(null);
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setAdjustmentDirection("IN");
      toast({ title: "Adjustment recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add adjustment", description: error.message, variant: "destructive" });
    },
  });

  const clearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountName(account.name);
  };

  const handleOpeningBalance = (account: Account) => {
    setOpeningBalanceAccount(account);
    setOpeningBalanceAmount("");
    setOpeningBalanceDate(format(new Date(), "yyyy-MM-dd"));
    setOpeningBalanceNotes("");
    setOpeningBalanceDialogOpen(true);
  };

  const handleAdjustment = (account: Account) => {
    setAdjustmentAccount(account);
    setAdjustmentAmount("");
    setAdjustmentDate(format(new Date(), "yyyy-MM-dd"));
    setAdjustmentReason("");
    setAdjustmentDirection("IN");
    setAdjustmentDialogOpen(true);
  };

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0);

  // Get account icon and styling based on name
  const getAccountStyle = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("cash")) {
      return { 
        icon: Banknote, 
        gradient: "from-emerald-500/20 to-emerald-600/10 dark:from-emerald-500/30 dark:to-emerald-600/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        borderColor: "border-emerald-200 dark:border-emerald-800"
      };
    }
    if (lowerName.includes("bank") || lowerName.includes("nbk") || lowerName.includes("cbk")) {
      return { 
        icon: Building2, 
        gradient: "from-blue-500/20 to-blue-600/10 dark:from-blue-500/30 dark:to-blue-600/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        borderColor: "border-blue-200 dark:border-blue-800"
      };
    }
    if (lowerName.includes("knet")) {
      return { 
        icon: CreditCard, 
        gradient: "from-purple-500/20 to-purple-600/10 dark:from-purple-500/30 dark:to-purple-600/20",
        iconColor: "text-purple-600 dark:text-purple-400",
        borderColor: "border-purple-200 dark:border-purple-800"
      };
    }
    if (lowerName.includes("wamd") || lowerName.includes("wallet")) {
      return { 
        icon: Smartphone, 
        gradient: "from-orange-500/20 to-orange-600/10 dark:from-orange-500/30 dark:to-orange-600/20",
        iconColor: "text-orange-600 dark:text-orange-400",
        borderColor: "border-orange-200 dark:border-orange-800"
      };
    }
    if (lowerName.includes("safe")) {
      return { 
        icon: ShieldCheck, 
        gradient: "from-slate-500/20 to-slate-600/10 dark:from-slate-500/30 dark:to-slate-600/20",
        iconColor: "text-slate-600 dark:text-slate-400",
        borderColor: "border-slate-200 dark:border-slate-700"
      };
    }
    return { 
      icon: Wallet, 
      gradient: "from-gray-500/20 to-gray-600/10 dark:from-gray-500/30 dark:to-gray-600/20",
      iconColor: "text-gray-600 dark:text-gray-400",
      borderColor: "border-gray-200 dark:border-gray-700"
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-accounts">Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage cash, bank accounts and balances</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Button variant="outline" onClick={() => { setAccountName(""); setAddAccountDialogOpen(true); }} data-testid="button-add-account">
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          )}
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-transfer">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transfer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Between Accounts</DialogTitle>
              </DialogHeader>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit((data) => createTransferMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={transferForm.control}
                    name="transferDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-transfer-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="fromAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-from-account">
                              <SelectValue placeholder="Select source account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id.toString()}>
                                {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-to-account">
                              <SelectValue placeholder="Select destination account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts
                              .filter((acc) => acc.id.toString() !== fromAccountId)
                              .map((acc) => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (KWD)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" min="0" data-testid="input-transfer-amount" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea data-testid="input-transfer-notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createTransferMutation.isPending} data-testid="button-submit-transfer">
                    {createTransferMutation.isPending ? "Processing..." : "Complete Transfer"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Total Balance Summary */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance (All Accounts)</p>
                <p className="text-3xl font-bold tabular-nums" data-testid="text-total-balance">
                  {totalBalance.toFixed(3)} <span className="text-lg font-normal text-muted-foreground">KWD</span>
                </p>
              </div>
              <Wallet className="w-10 h-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        {/* Account Cards Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Account Balances</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {accountsLoading ? (
              <div className="col-span-full text-center text-muted-foreground py-8">Loading accounts...</div>
            ) : (
              accounts.map((account) => {
                const style = getAccountStyle(account.name);
                const AccountIcon = style.icon;
                const balance = parseFloat(account.balance || "0");
                
                return (
                  <Card 
                    key={account.id} 
                    className={`cursor-pointer transition-all overflow-visible hover-elevate bg-gradient-to-br ${style.gradient} ${style.borderColor} ${
                      selectedAccount?.id === account.id ? "ring-2 ring-primary shadow-lg" : ""
                    }`}
                    onClick={() => setSelectedAccount(account)}
                    data-testid={`card-account-${account.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className={`p-2 rounded-lg bg-background/50 ${style.iconColor}`}>
                          <AccountIcon className="w-5 h-5" />
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="outline" className="shrink-0" data-testid={`button-account-menu-${account.id}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleAdjustment(account)} data-testid={`menu-adjustment-${account.id}`}>
                                <ArrowUpDown className="w-4 h-4 mr-2" />
                                Cash Adjustment
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpeningBalance(account)} data-testid={`menu-opening-balance-${account.id}`}>
                                <Banknote className="w-4 h-4 mr-2" />
                                Opening Balance
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditAccount(account)} data-testid={`menu-edit-${account.id}`}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${account.name}? This cannot be undone.`)) {
                                    deleteAccountMutation.mutate(account.id);
                                  }
                                }}
                                data-testid={`menu-delete-${account.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground/80">{account.name}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold tabular-nums" data-testid={`text-balance-${account.id}`}>
                            {balance.toFixed(3)}
                          </span>
                          <span className="text-xs text-muted-foreground">KWD</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Account Statement */}
        {selectedAccount && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">{selectedAccount.name} - Statement</CardTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-statement-start-date"
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-statement-end-date"
                />
                {(startDate || endDate) && (
                  <Button size="icon" variant="ghost" onClick={clearDates} data-testid="button-clear-dates">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="text-right w-[120px]">Amount</TableHead>
                        <TableHead className="text-right w-[120px]">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx, index) => (
                        <TableRow key={index} data-testid={`row-transaction-${index}`}>
                          <TableCell className="text-sm">{tx.date}</TableCell>
                          <TableCell className="text-sm">{tx.description}</TableCell>
                          <TableCell>
                            <Badge variant={tx.amount >= 0 ? "default" : "secondary"} className="text-xs">
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium tabular-nums ${tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {tx.balance.toFixed(3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedAccount && (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select an account above to view its statement</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transfers */}
        {transfers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                Recent Transfers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right w-[120px]">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.slice(0, 10).map((transfer) => (
                      <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                        <TableCell className="text-sm">{transfer.transferDate}</TableCell>
                        <TableCell>{transfer.fromAccount?.name || "-"}</TableCell>
                        <TableCell>{transfer.toAccount?.name || "-"}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {parseFloat(transfer.amount).toFixed(3)} KWD
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{transfer.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Account Name</label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter account name"
                data-testid="input-new-account-name"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => createAccountMutation.mutate(accountName)}
              disabled={createAccountMutation.isPending || !accountName.trim()}
              data-testid="button-submit-add-account"
            >
              {createAccountMutation.isPending ? "Creating..." : "Add Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Account Name</label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter account name"
                data-testid="input-edit-account-name"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => editingAccount && updateAccountMutation.mutate({ id: editingAccount.id, name: accountName })}
              disabled={updateAccountMutation.isPending || !accountName.trim()}
              data-testid="button-submit-edit-account"
            >
              {updateAccountMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Opening Balance Dialog */}
      <Dialog open={openingBalanceDialogOpen} onOpenChange={setOpeningBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Opening Balance - {openingBalanceAccount?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={openingBalanceDate}
                onChange={(e) => setOpeningBalanceDate(e.target.value)}
                data-testid="input-opening-balance-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (KWD)</label>
              <Input
                type="number"
                step="0.001"
                value={openingBalanceAmount}
                onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                placeholder="Enter opening balance amount"
                data-testid="input-opening-balance-amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={openingBalanceNotes}
                onChange={(e) => setOpeningBalanceNotes(e.target.value)}
                placeholder="e.g., Opening balance for fiscal year 2026"
                data-testid="input-opening-balance-notes"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => openingBalanceAccount && addOpeningBalanceMutation.mutate({ 
                accountId: openingBalanceAccount.id, 
                amount: openingBalanceAmount, 
                date: openingBalanceDate,
                notes: openingBalanceNotes || undefined
              })}
              disabled={addOpeningBalanceMutation.isPending || !openingBalanceAmount || !openingBalanceDate}
              data-testid="button-submit-opening-balance"
            >
              {addOpeningBalanceMutation.isPending ? "Adding..." : "Add Opening Balance"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cash Adjustment - {adjustmentAccount?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentDirection === "IN" ? "default" : "outline"}
                className={`flex-1 ${adjustmentDirection === "IN" ? "" : ""}`}
                onClick={() => setAdjustmentDirection("IN")}
                data-testid="button-adjustment-in"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Increase
              </Button>
              <Button
                type="button"
                variant={adjustmentDirection === "OUT" ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setAdjustmentDirection("OUT")}
                data-testid="button-adjustment-out"
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Decrease
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={adjustmentDate}
                onChange={(e) => setAdjustmentDate(e.target.value)}
                data-testid="input-adjustment-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (KWD)</label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="Enter adjustment amount"
                data-testid="input-adjustment-amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
              <Textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Cash counting correction, Petty cash reconciliation"
                data-testid="input-adjustment-reason"
              />
            </div>
            {adjustmentDirection === "OUT" && (
              <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                This will decrease the account balance by {adjustmentAmount || "0"} KWD
              </div>
            )}
            <Button 
              className="w-full" 
              onClick={() => adjustmentAccount && addAdjustmentMutation.mutate({ 
                accountId: adjustmentAccount.id, 
                amount: adjustmentAmount, 
                direction: adjustmentDirection,
                date: adjustmentDate,
                reason: adjustmentReason
              })}
              disabled={addAdjustmentMutation.isPending || !adjustmentAmount || !adjustmentDate || !adjustmentReason.trim()}
              data-testid="button-submit-adjustment"
            >
              {addAdjustmentMutation.isPending ? "Processing..." : "Apply Adjustment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
