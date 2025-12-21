import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { Pencil, Trash2, Loader2, Users, RotateCcw, Save, ClipboardCheck, AlertTriangle, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Supplier, PartyType } from "@shared/schema";

export default function PartyMaster() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_user";
  
  const [editingParty, setEditingParty] = useState<Supplier | null>(null);
  const [partyName, setPartyName] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyType, setPartyType] = useState<PartyType>("salesman");
  const [partyArea, setPartyArea] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [partyCountry, setPartyCountry] = useState("");
  const [partyEmail, setPartyEmail] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [ibanAccountNumber, setIbanAccountNumber] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Supplier | null>(null);
  
  const [filterType, setFilterType] = useState<"all" | PartyType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allParties = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch all customer balances for credit limit warnings
  const { data: customerBalances = [] } = useQuery<{ customerId: number; balance: number }[]>({
    queryKey: ["/api/customers/balances/all"],
  });

  // Create a map of customer ID to balance for quick lookup
  const balanceMap = new Map(customerBalances.map(b => [b.customerId, b.balance]));

  // Helper to check if customer is over credit limit
  const getCreditStatus = (party: Supplier) => {
    if (party.partyType !== "customer") return null;
    const limit = party.creditLimit ? parseFloat(party.creditLimit) : 0;
    if (limit === 0) return null; // No limit set
    const balance = balanceMap.get(party.id) || 0;
    const utilization = (balance / limit) * 100;
    if (balance > limit) return { status: "exceeded", balance, limit, utilization };
    if (utilization >= 80) return { status: "warning", balance, limit, utilization };
    return { status: "ok", balance, limit, utilization };
  };

  const filteredParties = allParties.filter(p => {
    const matchesType = filterType === "all" || p.partyType === filterType;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone && p.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.area && p.area.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const resetForm = () => {
    setEditingParty(null);
    setPartyName("");
    setPartyAddress("");
    setPartyPhone("");
    setPartyType("salesman");
    setCreditLimit("");
    setPartyArea("");
    setCommissionRate("");
    setPartyCountry("");
    setPartyEmail("");
    setBeneficiaryName("");
    setIbanAccountNumber("");
    setSwiftCode("");
    setBankName("");
    setBankAddress("");
  };

  useEffect(() => {
    if (editingParty) {
      setPartyName(editingParty.name);
      setPartyAddress(editingParty.address || "");
      setPartyPhone(editingParty.phone || "");
      setPartyType((editingParty.partyType as PartyType) || "supplier");
      setCreditLimit(editingParty.creditLimit || "");
      setPartyArea(editingParty.area || "");
      setCommissionRate(editingParty.commissionRate || "");
      setPartyCountry(editingParty.country || "");
      setPartyEmail(editingParty.email || "");
      setBeneficiaryName(editingParty.beneficiaryName || "");
      setIbanAccountNumber(editingParty.ibanAccountNumber || "");
      setSwiftCode(editingParty.swiftCode || "");
      setBankName(editingParty.bankName || "");
      setBankAddress(editingParty.bankAddress || "");
    }
  }, [editingParty]);

  interface PartyFormData {
    name: string;
    address: string | null;
    phone: string | null;
    partyType: PartyType;
    creditLimit: string | null;
    area: string | null;
    commissionRate: string | null;
    country: string | null;
    email: string | null;
    beneficiaryName: string | null;
    ibanAccountNumber: string | null;
    swiftCode: string | null;
    bankName: string | null;
    bankAddress: string | null;
  }

  const createMutation = useMutation({
    mutationFn: (data: PartyFormData) => 
      apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Party added successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to add party", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PartyFormData }) =>
      apiRequest("PUT", `/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Party updated successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update party", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/suppliers/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete party");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Party deleted successfully" });
      setDeleteDialogOpen(false);
      setPartyToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const settlementMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/salesmen/${id}/settle`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salesmen/settlement-status"] });
      toast({ title: "Settlement recorded", description: "Salesman account marked as settled today" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record settlement", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenEdit = (party: Supplier) => {
    setEditingParty(party);
    // Scroll to form at top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    const data: PartyFormData = {
      name: partyName.trim(),
      address: partyAddress.trim() || null,
      phone: partyPhone.trim() || null,
      partyType,
      creditLimit: (partyType === "customer" || partyType === "salesman") && creditLimit.trim() ? creditLimit.trim() : null,
      area: (partyType === "customer" || partyType === "salesman") && partyArea.trim() ? partyArea.trim() : null,
      commissionRate: partyType === "salesman" && commissionRate.trim() ? commissionRate.trim() : null,
      country: partyType === "supplier" && partyCountry.trim() ? partyCountry.trim() : null,
      email: partyType === "supplier" && partyEmail.trim() ? partyEmail.trim() : null,
      beneficiaryName: partyType === "supplier" && beneficiaryName.trim() ? beneficiaryName.trim() : null,
      ibanAccountNumber: partyType === "supplier" && ibanAccountNumber.trim() ? ibanAccountNumber.trim() : null,
      swiftCode: partyType === "supplier" && swiftCode.trim() ? swiftCode.trim() : null,
      bankName: partyType === "supplier" && bankName.trim() ? bankName.trim() : null,
      bankAddress: partyType === "supplier" && bankAddress.trim() ? bankAddress.trim() : null,
    };

    if (editingParty) {
      updateMutation.mutate({ id: editingParty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteClick = (party: Supplier) => {
    setPartyToDelete(party);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (partyToDelete) {
      deleteMutation.mutate(partyToDelete.id);
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "-";
    const num = parseFloat(value);
    return isNaN(num) ? "-" : `${num.toFixed(3)} KWD`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5" />
              {editingParty ? "Edit Party" : "Add New Party"}
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={resetForm} data-testid="button-reset-form">
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md bg-sky-100 dark:bg-sky-900/30">
                <div className="space-y-0.5">
                  <Label htmlFor="partyType" className="text-base">Party Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {partyType === "customer" ? "Customer (sales)" : partyType === "salesman" ? "Salesman (field sales)" : "Supplier (purchases)"}
                  </p>
                </div>
                <Select
                  value={partyType}
                  onValueChange={(value) => setPartyType(value as PartyType)}
                >
                  <SelectTrigger className="w-[180px]" data-testid="select-party-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="salesman">Salesman</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partyName">Party Name</Label>
                  <Input
                    id="partyName"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder="Enter party name"
                    data-testid="input-party-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyPhone">Phone Number</Label>
                  {(partyType === "customer" || partyType === "salesman") ? (
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        +965
                      </span>
                      <Input
                        id="partyPhone"
                        value={partyPhone.replace(/^\+965\s*/, "")}
                        onChange={(e) => setPartyPhone("+965 " + e.target.value.replace(/^\+965\s*/, ""))}
                        placeholder="Enter phone number"
                        className="rounded-l-none"
                        data-testid="input-party-phone"
                      />
                    </div>
                  ) : (
                    <Input
                      id="partyPhone"
                      value={partyPhone}
                      onChange={(e) => setPartyPhone(e.target.value)}
                      placeholder="Enter phone number (optional)"
                      data-testid="input-party-phone"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partyAddress">Address</Label>
                  <Input
                    id="partyAddress"
                    value={partyAddress}
                    onChange={(e) => setPartyAddress(e.target.value)}
                    placeholder="Enter address (optional)"
                    data-testid="input-party-address"
                  />
                </div>
                {(partyType === "customer" || partyType === "salesman") && (
                  <div className="space-y-2">
                    <Label htmlFor="partyArea">Area</Label>
                    <Select
                      value={partyArea || "none"}
                      onValueChange={(value) => setPartyArea(value === "none" ? "" : value)}
                    >
                      <SelectTrigger data-testid="select-party-area">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select area</SelectItem>
                        <SelectItem value="Fahaheel">Fahaheel</SelectItem>
                        <SelectItem value="Farwaniya">Farwaniya</SelectItem>
                        <SelectItem value="Jahra">Jahra</SelectItem>
                        <SelectItem value="Jaleeb">Jaleeb</SelectItem>
                        <SelectItem value="Khaitan">Khaitan</SelectItem>
                        <SelectItem value="Mahboula">Mahboula</SelectItem>
                        <SelectItem value="Margab">Margab</SelectItem>
                        <SelectItem value="Sharq">Sharq</SelectItem>
                        <SelectItem value="Souk Wataniya">Souk Wataniya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {partyType === "customer" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">Credit Limit (KWD)</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      step="0.001"
                      min="0"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="Enter maximum credit limit (optional)"
                      data-testid="input-credit-limit"
                    />
                  </div>
                </div>
              )}

              {partyType === "salesman" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">Credit Limit (KWD)</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      step="0.001"
                      min="0"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="Enter credit limit (optional)"
                      data-testid="input-salesman-credit-limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="Enter commission percentage (optional)"
                      data-testid="input-commission-rate"
                    />
                  </div>
                </div>
              )}

              {partyType === "supplier" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partyCountry">Country</Label>
                      <Input
                        id="partyCountry"
                        value={partyCountry}
                        onChange={(e) => setPartyCountry(e.target.value)}
                        placeholder="Enter country"
                        data-testid="input-party-country"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partyEmail">Email</Label>
                      <Input
                        id="partyEmail"
                        type="email"
                        value={partyEmail}
                        onChange={(e) => setPartyEmail(e.target.value)}
                        placeholder="Enter email address"
                        data-testid="input-party-email"
                      />
                    </div>
                  </div>

                  <Card className="mt-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Bank Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="beneficiaryName">Beneficiary Name</Label>
                          <Input
                            id="beneficiaryName"
                            value={beneficiaryName}
                            onChange={(e) => setBeneficiaryName(e.target.value)}
                            placeholder="Enter beneficiary name"
                            data-testid="input-beneficiary-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ibanAccountNumber">IBAN/Account Number</Label>
                          <Input
                            id="ibanAccountNumber"
                            value={ibanAccountNumber}
                            onChange={(e) => setIbanAccountNumber(e.target.value)}
                            placeholder="Enter IBAN or account number"
                            data-testid="input-iban-account"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="swiftCode">Swift Code</Label>
                          <Input
                            id="swiftCode"
                            value={swiftCode}
                            onChange={(e) => setSwiftCode(e.target.value)}
                            placeholder="Enter SWIFT/BIC code"
                            data-testid="input-swift-code"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Input
                            id="bankName"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="Enter bank name"
                            data-testid="input-bank-name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bankAddress">Bank Address</Label>
                        <Input
                          id="bankAddress"
                          value={bankAddress}
                          onChange={(e) => setBankAddress(e.target.value)}
                          placeholder="Enter bank address"
                          data-testid="input-bank-address"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={!partyName.trim() || createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-party"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editingParty ? "Update Party" : "Add Party"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Party List
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search by name, phone, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
              data-testid="input-search-party"
            />
            <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={filterType === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterType("all")}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              variant={filterType === "supplier" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterType("supplier")}
              data-testid="filter-supplier"
            >
              Suppliers
            </Button>
            <Button
              variant={filterType === "customer" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterType("customer")}
              data-testid="filter-customer"
            >
              Customers
            </Button>
            <Button
              variant={filterType === "salesman" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterType("salesman")}
              data-testid="filter-salesman"
            >
              Salesmen
            </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredParties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No parties found. {isAdmin && "Add your first party to get started."}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Party Name</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-28">Area</TableHead>
                    <TableHead className="w-36">Phone</TableHead>
                    <TableHead className="w-32 text-right">Credit/Commission</TableHead>
                    {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParties.map((party) => (
                    <TableRow key={party.id} data-testid={`row-party-${party.id}`}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {party.id}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-party-name-${party.id}`}>
                        {party.name}
                      </TableCell>
                      <TableCell data-testid={`text-party-type-${party.id}`}>
                        <Badge 
                          variant={party.partyType === "customer" ? "default" : party.partyType === "salesman" ? "outline" : "secondary"}
                          className="capitalize"
                        >
                          {party.partyType || "supplier"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-party-address-${party.id}`}>
                        {party.address || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-party-area-${party.id}`}>
                        {party.area || "-"}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-party-phone-${party.id}`}>
                        {party.phone || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium" data-testid={`text-credit-limit-${party.id}`}>
                        {party.partyType === "customer" ? (
                          <div className="flex items-center justify-end gap-1">
                            {(() => {
                              const creditStatus = getCreditStatus(party);
                              if (creditStatus && (creditStatus.status === "exceeded" || creditStatus.status === "warning")) {
                                return (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle 
                                        className={`h-4 w-4 ${creditStatus.status === "exceeded" ? "text-red-500" : "text-amber-500"}`}
                                        data-testid={`icon-credit-warning-${party.id}`}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs">
                                        <p className="font-medium">
                                          {creditStatus.status === "exceeded" ? "Credit Limit Exceeded!" : "Approaching Credit Limit"}
                                        </p>
                                        <p>Balance: {creditStatus.balance.toFixed(3)} KWD</p>
                                        <p>Limit: {creditStatus.limit.toFixed(3)} KWD</p>
                                        <p>Utilization: {creditStatus.utilization.toFixed(0)}%</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              }
                              return null;
                            })()}
                            <span>{formatCurrency(party.creditLimit)}</span>
                          </div>
                        ) : party.partyType === "salesman" && party.commissionRate ? `${party.commissionRate}%` : "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {party.partyType === "salesman" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => settlementMutation.mutate(party.id)}
                                    disabled={settlementMutation.isPending}
                                    data-testid={`button-settle-${party.id}`}
                                  >
                                    <ClipboardCheck className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mark account settled</p>
                                  {party.lastStockCheckDate ? (
                                    <p className="text-xs text-muted-foreground">
                                      Last settlement: {new Date(party.lastStockCheckDate).toLocaleDateString()}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Never settled</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(party)}
                              data-testid={`button-edit-party-${party.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(party)}
                              data-testid={`button-delete-party-${party.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Party</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{partyToDelete?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
