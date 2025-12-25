import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowRightLeft, Wallet, FileText, X, Plus, Pencil, Trash2, Banknote } from "lucide-react";
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
      if (openingBalanceAccount) {
        queryClient.invalidateQueries({ queryKey: [`/api/accounts/${openingBalanceAccount.id}/transactions`] });
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

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="heading-accounts">Accounts</h1>
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

      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          {accountsLoading ? (
            <div className="col-span-5 text-center text-muted-foreground py-8">Loading accounts...</div>
          ) : (
            accounts.map((account) => (
              <Card 
                key={account.id} 
                className={`cursor-pointer transition-colors ${
                  selectedAccount?.id === account.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedAccount(account)}
                data-testid={`card-account-${account.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleOpeningBalance(account); }}
                          title="Add Opening Balance"
                          data-testid={`button-opening-balance-${account.id}`}
                        >
                          <Banknote className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleEditAccount(account); }}
                          title="Edit Account"
                          data-testid={`button-edit-account-${account.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (confirm(`Are you sure you want to delete ${account.name}?`)) {
                              deleteAccountMutation.mutate(account.id);
                            }
                          }}
                          title="Delete Account"
                          data-testid={`button-delete-account-${account.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold" data-testid={`text-balance-${account.id}`}>
                    {parseFloat(account.balance || "0").toFixed(3)} KWD
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {selectedAccount && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <CardTitle>{selectedAccount.name} - Statement</CardTitle>
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
            <CardContent>
              {transactionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount (KWD)</TableHead>
                      <TableHead className="text-right">Balance (KWD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx, index) => (
                      <TableRow key={index} data-testid={`row-transaction-${index}`}>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          <Badge variant={tx.amount >= 0 ? "default" : "secondary"}>
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {tx.balance.toFixed(3)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedAccount && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                Select an account above to view its statement
              </div>
            </CardContent>
          </Card>
        )}

        {transfers.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Recent Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Amount (KWD)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                      <TableCell>{transfer.transferDate}</TableCell>
                      <TableCell>{transfer.fromAccount?.name || "-"}</TableCell>
                      <TableCell>{transfer.toAccount?.name || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(transfer.amount).toFixed(3)}
                      </TableCell>
                      <TableCell>{transfer.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            <DialogTitle>Edit Account</DialogTitle>
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
    </div>
  );
}
