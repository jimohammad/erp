import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Package, Users, Building2, Shield, Wallet } from "lucide-react";
import { formatKWD, toDecimal } from "@/lib/currency";
import type { 
  InventoryAdjustmentWithDetails, 
  OpeningBalanceWithDetails, 
  Item, 
  Branch, 
  Customer, 
  Supplier,
  Account 
} from "@shared/schema";

export default function OpeningBalances() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isAdminOrSuperUser = user?.role === "admin" || user?.role === "superuser" || user?.role === "super_user";
  
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  
  const [stockItemId, setStockItemId] = useState<string>("");
  const [stockBranchId, setStockBranchId] = useState<string>("");
  const [stockQuantity, setStockQuantity] = useState<string>("");
  const [stockUnitCost, setStockUnitCost] = useState<string>("");
  const [stockEffectiveDate, setStockEffectiveDate] = useState<string>("2025-12-31");
  const [stockNotes, setStockNotes] = useState<string>("");

  const [balancePartyType, setBalancePartyType] = useState<string>("customer");
  const [balancePartyId, setBalancePartyId] = useState<string>("");
  const [balanceBranchId, setBalanceBranchId] = useState<string>("");
  const [balanceAmount, setBalanceAmount] = useState<string>("");
  const [balanceEffectiveDate, setBalanceEffectiveDate] = useState<string>("2025-12-31");
  const [balanceNotes, setBalanceNotes] = useState<string>("");

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>("");
  const [accountAmount, setAccountAmount] = useState<string>("");
  const [accountDate, setAccountDate] = useState<string>("2025-12-31");
  const [accountNotes, setAccountNotes] = useState<string>("");

  const { data: stockAdjustments = [], isLoading: stockLoading } = useQuery<InventoryAdjustmentWithDetails[]>({
    queryKey: ["/api/inventory-adjustments"],
  });

  const { data: openingBalances = [], isLoading: balancesLoading } = useQuery<OpeningBalanceWithDetails[]>({
    queryKey: ["/api/opening-balances"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const createStockMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventory-adjustments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-adjustments"] });
      setIsAddStockOpen(false);
      resetStockForm();
      toast({ title: "Opening stock added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add opening stock", description: error.message, variant: "destructive" });
    },
  });

  const deleteStockMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/inventory-adjustments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-adjustments"] });
      toast({ title: "Opening stock deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const createBalanceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/opening-balances", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opening-balances"] });
      setIsAddBalanceOpen(false);
      resetBalanceForm();
      toast({ title: "Opening balance added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add opening balance", description: error.message, variant: "destructive" });
    },
  });

  const deleteBalanceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/opening-balances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opening-balances"] });
      toast({ title: "Opening balance deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const createAccountBalanceMutation = useMutation({
    mutationFn: async (data: { accountId: number; amount: string; date: string; notes?: string }) => {
      return apiRequest("POST", `/api/accounts/${data.accountId}/opening-balance`, {
        amount: data.amount,
        date: data.date,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setIsAddAccountOpen(false);
      resetAccountForm();
      toast({ title: "Account opening balance added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add account balance", description: error.message, variant: "destructive" });
    },
  });

  const resetAccountForm = () => {
    setAccountId("");
    setAccountAmount("");
    setAccountDate("2025-12-31");
    setAccountNotes("");
  };

  const handleAddAccountBalance = () => {
    if (!accountId || !accountAmount || !accountDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createAccountBalanceMutation.mutate({
      accountId: parseInt(accountId),
      amount: accountAmount,
      date: accountDate,
      notes: accountNotes || undefined,
    });
  };

  const resetStockForm = () => {
    setStockItemId("");
    setStockBranchId("");
    setStockQuantity("");
    setStockUnitCost("");
    setStockEffectiveDate("2025-12-31");
    setStockNotes("");
  };

  const resetBalanceForm = () => {
    setBalancePartyType("customer");
    setBalancePartyId("");
    setBalanceBranchId("");
    setBalanceAmount("");
    setBalanceEffectiveDate("2025-12-31");
    setBalanceNotes("");
  };

  const handleAddStock = () => {
    if (!stockItemId || !stockBranchId || !stockQuantity || !stockEffectiveDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createStockMutation.mutate({
      itemId: parseInt(stockItemId),
      branchId: parseInt(stockBranchId),
      quantity: parseInt(stockQuantity),
      unitCostKwd: stockUnitCost ?? null,
      effectiveDate: stockEffectiveDate,
      adjustmentType: "opening",
      notes: stockNotes || null,
    });
  };

  const handleAddBalance = () => {
    if (!balancePartyId || !balanceAmount || !balanceEffectiveDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createBalanceMutation.mutate({
      partyType: balancePartyType,
      partyId: parseInt(balancePartyId),
      branchId: balanceBranchId ? parseInt(balanceBranchId) : null,
      balanceAmount: balanceAmount,
      effectiveDate: balanceEffectiveDate,
      notes: balanceNotes || null,
    });
  };

  const formatCurrencyDisplay = (amount: string | null) => {
    if (!amount) return "-";
    return `KWD ${formatKWD(amount)}`;
  };

  const parties = balancePartyType === "customer" ? customers : suppliers;

  if (!isAdminOrSuperUser) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Only Admins and Super Users can manage opening balances.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your current role: <Badge variant="secondary">{user?.role || "user"}</Badge>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Opening Balances</h1>
        <p className="text-muted-foreground">
          Set up opening stock and party balances before go-live (December 31, 2025)
        </p>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts" data-testid="tab-accounts">
            <Wallet className="h-4 w-4 mr-2" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="balances" data-testid="tab-balances">
            <Users className="h-4 w-4 mr-2" />
            Party Balances
          </TabsTrigger>
          <TabsTrigger value="stock" data-testid="tab-stock">
            <Package className="h-4 w-4 mr-2" />
            Opening Stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Account Balances</CardTitle>
                <CardDescription>
                  Set opening balances for Cash and Bank accounts
                </CardDescription>
              </div>
              <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-account-balance">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Opening Balance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Account Opening Balance</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Account *</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger data-testid="select-account">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (KWD) *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={accountAmount}
                        onChange={(e) => setAccountAmount(e.target.value)}
                        placeholder="0.000"
                        data-testid="input-account-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Effective Date *</Label>
                      <Input
                        type="date"
                        value={accountDate}
                        onChange={(e) => setAccountDate(e.target.value)}
                        data-testid="input-account-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        value={accountNotes}
                        onChange={(e) => setAccountNotes(e.target.value)}
                        placeholder="Opening balance for FY 2026"
                        data-testid="input-account-notes"
                      />
                    </div>
                    <Button 
                      onClick={handleAddAccountBalance} 
                      className="w-full"
                      disabled={createAccountBalanceMutation.isPending}
                      data-testid="button-save-account-balance"
                    >
                      {createAccountBalanceMutation.isPending ? "Adding..." : "Add Opening Balance"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Current Balance (KWD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatKWD(account.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Opening Stock</CardTitle>
                <CardDescription>
                  Enter your existing warehouse inventory as of the go-live date
                </CardDescription>
              </div>
              <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-stock">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Opening Stock
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Opening Stock</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Item *</Label>
                      <Select value={stockItemId} onValueChange={setStockItemId}>
                        <SelectTrigger data-testid="select-stock-item">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Branch *</Label>
                      <Select value={stockBranchId} onValueChange={setStockBranchId}>
                        <SelectTrigger data-testid="select-stock-branch">
                          <Building2 className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={stockQuantity}
                          onChange={(e) => setStockQuantity(e.target.value)}
                          placeholder="0"
                          data-testid="input-stock-quantity"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Cost (KWD)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={stockUnitCost}
                          onChange={(e) => setStockUnitCost(e.target.value)}
                          placeholder="0.000"
                          data-testid="input-stock-cost"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Effective Date *</Label>
                      <Input
                        type="date"
                        value={stockEffectiveDate}
                        onChange={(e) => setStockEffectiveDate(e.target.value)}
                        data-testid="input-stock-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        value={stockNotes}
                        onChange={(e) => setStockNotes(e.target.value)}
                        placeholder="Optional notes"
                        data-testid="input-stock-notes"
                      />
                    </div>
                    <Button 
                      onClick={handleAddStock} 
                      className="w-full"
                      disabled={createStockMutation.isPending}
                      data-testid="button-save-stock"
                    >
                      {createStockMutation.isPending ? "Adding..." : "Add Opening Stock"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : stockAdjustments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No opening stock entries yet. Click "Add Opening Stock" to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockAdjustments.map((adj) => (
                        <TableRow key={adj.id} data-testid={`row-stock-${adj.id}`}>
                          <TableCell className="font-medium">{adj.item?.name || "Unknown"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{adj.branch?.name || "Unknown"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{adj.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrencyDisplay(adj.unitCostKwd)}</TableCell>
                          <TableCell>{adj.effectiveDate}</TableCell>
                          <TableCell className="text-muted-foreground">{adj.notes || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteStockMutation.mutate(adj.id)}
                              data-testid={`button-delete-stock-${adj.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Party Balances</CardTitle>
                <CardDescription>
                  Enter outstanding balances for customers and suppliers as of the go-live date
                </CardDescription>
              </div>
              <Dialog open={isAddBalanceOpen} onOpenChange={setIsAddBalanceOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-balance">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Opening Balance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Opening Balance</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Party Type *</Label>
                      <Select value={balancePartyType} onValueChange={(v) => { setBalancePartyType(v); setBalancePartyId(""); }}>
                        <SelectTrigger data-testid="select-balance-party-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{balancePartyType === "customer" ? "Customer" : "Supplier"} *</Label>
                      <Select value={balancePartyId} onValueChange={setBalancePartyId}>
                        <SelectTrigger data-testid="select-balance-party">
                          <SelectValue placeholder={`Select ${balancePartyType}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {parties.map((party) => (
                            <SelectItem key={party.id} value={party.id.toString()}>
                              {party.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Branch (optional)</Label>
                      <Select 
                        value={balanceBranchId || "none"} 
                        onValueChange={(v) => setBalanceBranchId(v === "none" ? "" : v)}
                      >
                        <SelectTrigger data-testid="select-balance-branch">
                          <Building2 className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="All branches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">All branches</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Balance Amount (KWD) *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        placeholder="Positive = they owe us, Negative = we owe them"
                        data-testid="input-balance-amount"
                      />
                      <p className="text-xs text-muted-foreground">
                        Positive amount: they owe you. Negative amount: you owe them.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Effective Date *</Label>
                      <Input
                        type="date"
                        value={balanceEffectiveDate}
                        onChange={(e) => setBalanceEffectiveDate(e.target.value)}
                        data-testid="input-balance-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        value={balanceNotes}
                        onChange={(e) => setBalanceNotes(e.target.value)}
                        placeholder="Optional notes"
                        data-testid="input-balance-notes"
                      />
                    </div>
                    <Button 
                      onClick={handleAddBalance} 
                      className="w-full"
                      disabled={createBalanceMutation.isPending}
                      data-testid="button-save-balance"
                    >
                      {createBalanceMutation.isPending ? "Adding..." : "Add Opening Balance"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : openingBalances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No opening balances yet. Click "Add Opening Balance" to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openingBalances.map((bal) => (
                        <TableRow key={bal.id} data-testid={`row-balance-${bal.id}`}>
                          <TableCell>
                            <Badge variant={bal.partyType === "customer" ? "default" : "secondary"}>
                              {bal.partyType === "customer" ? "Customer" : "Supplier"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{bal.partyName || "Unknown"}</TableCell>
                          <TableCell>
                            {bal.branch ? (
                              <Badge variant="outline">{bal.branch.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">All</span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${toDecimal(bal.balanceAmount).greaterThanOrEqualTo(0) ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrencyDisplay(bal.balanceAmount)}
                          </TableCell>
                          <TableCell>{bal.effectiveDate}</TableCell>
                          <TableCell className="text-muted-foreground">{bal.notes || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBalanceMutation.mutate(bal.id)}
                              data-testid={`button-delete-balance-${bal.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
