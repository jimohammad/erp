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
import { Pencil, Trash2, Loader2, Users, RotateCcw, Save, ClipboardCheck, AlertTriangle, Building2, Link, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Supplier, PartyType } from "@shared/schema";
import { PARTY_TYPE_LABELS } from "@shared/schema";

export default function PartyMaster() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superuser" || user?.role === "super_user";
  
  const [editingParty, setEditingParty] = useState<Supplier | null>(null);
  const [partyName, setPartyName] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyType, setPartyType] = useState<PartyType>("salesman");
  const [partyArea, setPartyArea] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [partyCountry, setPartyCountry] = useState("");
  const [partyEmail, setPartyEmail] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [ibanAccountNumber, setIbanAccountNumber] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Supplier | null>(null);
  
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [statementSalesman, setStatementSalesman] = useState<Supplier | null>(null);
  const [statementPin, setStatementPin] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);
  
  const [filterType, setFilterType] = useState<"all" | PartyType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

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

  const totalPages = Math.ceil(filteredParties.length / PAGE_SIZE);
  const paginatedParties = filteredParties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleFilterChange = (value: "all" | PartyType) => {
    setFilterType(value);
    setPage(1);
  };

  const resetForm = () => {
    setEditingParty(null);
    setPartyName("");
    setPartyAddress("");
    setPartyPhone("");
    setPartyType("salesman");
    setCreditLimit("");
    setOpeningBalance("");
    setPartyArea("");
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
      setOpeningBalance(editingParty.openingBalance || "");
      setPartyArea(editingParty.area || "");
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
    category: string | null;
    creditLimit: string | null;
    openingBalance: string | null;
    area: string | null;
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
      return await apiRequest("POST", `/api/salesmen/${id}/settle`);
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

  const statementAccessMutation = useMutation({
    mutationFn: async ({ id, pin }: { id: number; pin: string }) => {
      return await apiRequest<{ success: boolean; token: string; statementUrl: string }>("POST", `/api/salesmen/${id}/generate-statement-access`, { pin });
    },
    onSuccess: (data: { success: boolean; token: string; statementUrl: string }) => {
      const fullUrl = `${window.location.origin}/salesman-statement/${data.token}`;
      setGeneratedUrl(fullUrl);
      toast({ title: "Statement access created", description: "Link generated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate statement access", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenStatementDialog = (party: Supplier) => {
    setStatementSalesman(party);
    setStatementPin("");
    setGeneratedUrl("");
    setUrlCopied(false);
    setStatementDialogOpen(true);
  };

  const handleGenerateStatementAccess = () => {
    if (!statementSalesman || !statementPin || statementPin.length < 4) {
      toast({ title: "PIN must be at least 4 digits", variant: "destructive" });
      return;
    }
    statementAccessMutation.mutate({ id: statementSalesman.id, pin: statementPin });
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy URL", variant: "destructive" });
    }
  };

  const handleOpenEdit = (party: Supplier) => {
    setEditingParty(party);
    // Scroll to form at top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    const isSupplierType = ["supplier", "logistic", "packing", "partner"].includes(partyType);

    const data: PartyFormData = {
      name: partyName.trim(),
      address: partyAddress.trim() || null,
      phone: partyPhone.trim() || null,
      partyType,
      category: null,
      creditLimit: (partyType === "customer" || partyType === "salesman") && creditLimit.trim() ? creditLimit.trim() : null,
      openingBalance: partyType === "salesman" && openingBalance.trim() ? openingBalance.trim() : null,
      area: (partyType === "customer" || partyType === "salesman") && partyArea.trim() ? partyArea.trim() : null,
      country: isSupplierType && partyCountry.trim() ? partyCountry.trim() : null,
      email: isSupplierType && partyEmail.trim() ? partyEmail.trim() : null,
      beneficiaryName: isSupplierType && beneficiaryName.trim() ? beneficiaryName.trim() : null,
      ibanAccountNumber: isSupplierType && ibanAccountNumber.trim() ? ibanAccountNumber.trim() : null,
      swiftCode: isSupplierType && swiftCode.trim() ? swiftCode.trim() : null,
      bankName: isSupplierType && bankName.trim() ? bankName.trim() : null,
      bankAddress: isSupplierType && bankAddress.trim() ? bankAddress.trim() : null,
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
                    {PARTY_TYPE_LABELS[partyType]}
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
                    {(Object.entries(PARTY_TYPE_LABELS) as [PartyType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
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
                    <Label htmlFor="openingBalance">Opening Balance (KWD)</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      step="0.001"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      placeholder="Enter opening balance (if any)"
                      data-testid="input-salesman-opening-balance"
                    />
                  </div>
                </div>
              )}

              {["supplier", "logistic", "packing", "partner"].includes(partyType) && (
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-64"
              data-testid="input-search-party"
            />
            <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={filterType === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange("all")}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              variant={filterType === "supplier" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange("supplier")}
              data-testid="filter-supplier"
            >
              Suppliers
            </Button>
            <Button
              variant={filterType === "customer" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange("customer")}
              data-testid="filter-customer"
            >
              Customers
            </Button>
            <Button
              variant={filterType === "salesman" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange("salesman")}
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
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 py-2">ID</TableHead>
                      <TableHead className="py-2">Party Name</TableHead>
                      <TableHead className="w-28 py-2">Type</TableHead>
                      <TableHead className="w-28 py-2">Area</TableHead>
                      <TableHead className="w-36 py-2">Phone</TableHead>
                      <TableHead className="w-32 text-right py-2">Credit/Commission</TableHead>
                      {isAdmin && <TableHead className="w-24 text-right py-2">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedParties.map((party) => (
                    <TableRow key={party.id} data-testid={`row-party-${party.id}`}>
                      <TableCell className="py-2 font-mono text-sm text-muted-foreground">
                        {party.id}
                      </TableCell>
                      <TableCell className="py-2 font-medium" data-testid={`text-party-name-${party.id}`}>
                        {party.name}
                      </TableCell>
                      <TableCell className="py-2" data-testid={`text-party-type-${party.id}`}>
                        <Badge 
                          variant={party.partyType === "customer" ? "default" : party.partyType === "salesman" ? "outline" : "secondary"}
                          className="capitalize"
                        >
                          {party.partyType || "supplier"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-sm text-muted-foreground" data-testid={`text-party-area-${party.id}`}>
                        {party.area || "-"}
                      </TableCell>
                      <TableCell className="py-2 text-sm" data-testid={`text-party-phone-${party.id}`}>
                        {party.phone || "-"}
                      </TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium" data-testid={`text-credit-limit-${party.id}`}>
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
                        ) : party.partyType === "salesman" ? formatCurrency(party.creditLimit) : "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            {party.partyType === "salesman" && (() => {
                              const SETTLEMENT_CYCLE_DAYS = 90;
                              const WARNING_THRESHOLD_DAYS = 14;
                              const lastDate = party.lastStockCheckDate ? new Date(party.lastStockCheckDate) : null;
                              const today = new Date();
                              
                              let status: 'overdue' | 'due-soon' | 'ok' = 'overdue';
                              let daysRemaining = 0;
                              let statusText = 'Never settled - Overdue';
                              
                              if (lastDate) {
                                const nextDueDate = new Date(lastDate);
                                nextDueDate.setDate(nextDueDate.getDate() + SETTLEMENT_CYCLE_DAYS);
                                const diffTime = nextDueDate.getTime() - today.getTime();
                                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (daysRemaining < 0) {
                                  status = 'overdue';
                                  statusText = `${Math.abs(daysRemaining)} days overdue`;
                                } else if (daysRemaining <= WARNING_THRESHOLD_DAYS) {
                                  status = 'due-soon';
                                  statusText = `Due in ${daysRemaining} days`;
                                } else {
                                  status = 'ok';
                                  statusText = `${daysRemaining} days remaining`;
                                }
                              }
                              
                              const iconColor = status === 'overdue' ? 'text-red-500' : 
                                               status === 'due-soon' ? 'text-amber-500' : 
                                               'text-green-500';
                              
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => settlementMutation.mutate(party.id)}
                                      disabled={settlementMutation.isPending}
                                      data-testid={`button-settle-${party.id}`}
                                    >
                                      <ClipboardCheck className={`h-4 w-4 ${iconColor}`} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">Click to mark settled</p>
                                    <p className={`text-xs ${status === 'overdue' ? 'text-red-400' : status === 'due-soon' ? 'text-amber-400' : 'text-green-400'}`}>
                                      {statusText}
                                    </p>
                                    {lastDate && (
                                      <p className="text-xs text-muted-foreground">
                                        Last: {lastDate.toLocaleDateString()}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                            {party.partyType === "salesman" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenStatementDialog(party)}
                                    data-testid={`button-statement-${party.id}`}
                                  >
                                    <Link className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Generate statement link</p>
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, filteredParties.length)} of {filteredParties.length} parties
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-parties-prev-page"
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
                      data-testid="button-parties-next-page"
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

      <Dialog open={statementDialogOpen} onOpenChange={setStatementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Statement Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a secure link for <span className="font-medium">{statementSalesman?.name}</span> to view their account statement.
            </p>
            
            {!generatedUrl ? (
              <div className="space-y-2">
                <Label htmlFor="statement-pin">Set PIN (4-6 digits)</Label>
                <Input
                  id="statement-pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter 4-6 digit PIN"
                  value={statementPin}
                  onChange={(e) => setStatementPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-xl tracking-widest"
                  data-testid="input-statement-pin"
                />
                <p className="text-xs text-muted-foreground">
                  The salesman will need this PIN to access their statement.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Statement Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={generatedUrl}
                    className="text-xs"
                    data-testid="input-generated-url"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyUrl}
                    data-testid="button-copy-url"
                  >
                    {urlCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with the salesman. PIN: <span className="font-mono font-medium">{statementPin}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatementDialogOpen(false)}>
              {generatedUrl ? "Close" : "Cancel"}
            </Button>
            {!generatedUrl && (
              <Button
                onClick={handleGenerateStatementAccess}
                disabled={statementAccessMutation.isPending || statementPin.length < 4}
                data-testid="button-generate-access"
              >
                {statementAccessMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
