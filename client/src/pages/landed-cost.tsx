import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Eye, Trash2, Plus, Calculator, Package, DollarSign, Truck, Pencil } from "lucide-react";
import { format } from "date-fns";
import type { LandedCostVoucherWithDetails, PurchaseOrderWithDetails, Item } from "@shared/schema";

interface PartnerProfitSetting {
  category: string;
  profitPerUnit: string;
}

const CURRENCIES = ["KWD", "USD", "AED", "CNY", "HKD"];

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0.000";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "0.000" : num.toFixed(3);
}

function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

export default function LandedCostPage() {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<LandedCostVoucherWithDetails | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewVoucher, setViewVoucher] = useState<LandedCostVoucherWithDetails | null>(null);

  const { data: vouchers = [], isLoading } = useQuery<LandedCostVoucherWithDetails[]>({
    queryKey: ["/api/landed-cost-vouchers", currentBranch?.id],
    queryFn: async () => {
      const url = currentBranch?.id 
        ? `/api/landed-cost-vouchers?branchId=${currentBranch.id}`
        : "/api/landed-cost-vouchers";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/landed-cost-vouchers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landed-cost-vouchers"] });
      toast({ title: "Voucher Deleted", description: "Landed cost voucher has been deleted." });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete voucher.", variant: "destructive" });
    },
  });

  const filteredVouchers = useMemo(() => {
    if (!searchQuery) return vouchers;
    const q = searchQuery.toLowerCase();
    return vouchers.filter(v => 
      v.voucherNumber.toLowerCase().includes(q) ||
      v.purchaseOrder?.invoiceNumber?.toLowerCase().includes(q)
    );
  }, [vouchers, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Landed Cost Vouchers</h1>
          <p className="text-muted-foreground text-sm">
            Track freight, partner profit, and charges for accurate costing
          </p>
        </div>
        <Button onClick={() => { setEditingVoucher(null); setShowForm(true); }} data-testid="button-new-voucher">
          <Plus className="h-4 w-4 mr-2" />
          New Voucher
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vouchers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2">Voucher #</TableHead>
                <TableHead className="py-2">Date</TableHead>
                <TableHead className="py-2">PO Reference</TableHead>
                <TableHead className="py-2 text-right">Total Freight</TableHead>
                <TableHead className="py-2 text-right">Partner Profit</TableHead>
                <TableHead className="py-2 text-right">Grand Total</TableHead>
                <TableHead className="py-2 text-right">Items</TableHead>
                <TableHead className="py-2 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No landed cost vouchers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVouchers.map((v) => (
                  <TableRow key={v.id} data-testid={`row-voucher-${v.id}`}>
                    <TableCell className="py-1 font-medium">{v.voucherNumber}</TableCell>
                    <TableCell className="py-1">
                      {format(new Date(v.voucherDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="py-1">
                      {v.purchaseOrder?.invoiceNumber || `PO #${v.purchaseOrderId}`}
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono">
                      {formatCurrency(v.totalFreightKwd)} KWD
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono">
                      {formatCurrency(v.totalPartnerProfitKwd)} KWD
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono font-semibold">
                      {formatCurrency(v.grandTotalKwd)} KWD
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <Badge variant="secondary">{v.lineItems?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewVoucher(v)}
                          data-testid={`button-view-${v.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEditingVoucher(v); setShowForm(true); }}
                          data-testid={`button-edit-${v.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(v.id)}
                          data-testid={`button-delete-${v.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showForm && (
        <LandedCostFormDialog
          voucher={editingVoucher}
          branchId={currentBranch?.id}
          onClose={() => { setShowForm(false); setEditingVoucher(null); }}
        />
      )}

      {viewVoucher && (
        <LandedCostViewDialog
          voucher={viewVoucher}
          onClose={() => setViewVoucher(null)}
        />
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the landed cost voucher and its allocations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface LandedCostFormDialogProps {
  voucher: LandedCostVoucherWithDetails | null;
  branchId?: number;
  onClose: () => void;
}

function LandedCostFormDialog({ voucher, branchId, onClose }: LandedCostFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!voucher;

  const [selectedPOId, setSelectedPOId] = useState<number | null>(voucher?.purchaseOrderId || null);
  const [voucherDate, setVoucherDate] = useState(voucher?.voucherDate || new Date().toISOString().split("T")[0]);
  const [allocationMethod, setAllocationMethod] = useState(voucher?.allocationMethod || "quantity");
  const [notes, setNotes] = useState(voucher?.notes || "");

  const [hkToDxbAmount, setHkToDxbAmount] = useState(voucher?.hkToDxbAmount || "");
  const [hkToDxbCurrency, setHkToDxbCurrency] = useState(voucher?.hkToDxbCurrency || "USD");
  const [hkToDxbFxRate, setHkToDxbFxRate] = useState(voucher?.hkToDxbFxRate || "0.307");

  const [dxbToKwiAmount, setDxbToKwiAmount] = useState(voucher?.dxbToKwiAmount || "");
  const [dxbToKwiCurrency, setDxbToKwiCurrency] = useState(voucher?.dxbToKwiCurrency || "AED");
  const [dxbToKwiFxRate, setDxbToKwiFxRate] = useState(voucher?.dxbToKwiFxRate || "0.0835");

  const [bankChargesAmount, setBankChargesAmount] = useState(voucher?.bankChargesAmount || "");
  const [bankChargesCurrency, setBankChargesCurrency] = useState(voucher?.bankChargesCurrency || "KWD");
  const [bankChargesFxRate, setBankChargesFxRate] = useState(voucher?.bankChargesFxRate || "1");

  const [packingChargesAmount, setPackingChargesAmount] = useState(voucher?.packingChargesAmount || "");
  const [packingChargesCurrency, setPackingChargesCurrency] = useState(voucher?.packingChargesCurrency || "KWD");
  const [packingChargesFxRate, setPackingChargesFxRate] = useState(voucher?.packingChargesFxRate || "1");

  const { data: purchases = [] } = useQuery<PurchaseOrderWithDetails[]>({
    queryKey: ["/api/purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchases");
      return res.json();
    },
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const res = await fetch("/api/items", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const itemCategoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach(item => {
      map[item.name] = item.category || "";
    });
    return map;
  }, [items]);

  const { data: partnerProfitSettings } = useQuery<{ settings: PartnerProfitSetting[] }>({
    queryKey: ["/api/settings/partner-profit"],
    queryFn: async () => {
      const res = await fetch("/api/settings/partner-profit", { credentials: "include" });
      if (!res.ok) return { settings: [] };
      return res.json();
    },
  });

  const { data: nextNumber } = useQuery<{ voucherNumber: string }>({
    queryKey: ["/api/landed-cost-vouchers/next-number"],
    queryFn: async () => {
      const res = await fetch("/api/landed-cost-vouchers/next-number", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get next number");
      return res.json();
    },
    enabled: !isEditing,
  });

  const selectedPO = useMemo(() => {
    return purchases.find(p => p.id === selectedPOId);
  }, [purchases, selectedPOId]);

  const hkToDxbKwd = useMemo(() => {
    const amt = parseDecimal(hkToDxbAmount);
    const rate = parseDecimal(hkToDxbFxRate);
    return amt * rate;
  }, [hkToDxbAmount, hkToDxbFxRate]);

  const dxbToKwiKwd = useMemo(() => {
    const amt = parseDecimal(dxbToKwiAmount);
    const rate = parseDecimal(dxbToKwiFxRate);
    return amt * rate;
  }, [dxbToKwiAmount, dxbToKwiFxRate]);

  const bankChargesKwd = useMemo(() => {
    const amt = parseDecimal(bankChargesAmount);
    const rate = parseDecimal(bankChargesFxRate);
    return amt * rate;
  }, [bankChargesAmount, bankChargesFxRate]);

  const packingChargesKwd = useMemo(() => {
    const amt = parseDecimal(packingChargesAmount);
    const rate = parseDecimal(packingChargesFxRate);
    return amt * rate;
  }, [packingChargesAmount, packingChargesFxRate]);

  const totalFreightKwd = hkToDxbKwd + dxbToKwiKwd;
  const totalChargesKwd = bankChargesKwd + packingChargesKwd;

  const totalQuantity = useMemo(() => {
    if (!selectedPO?.lineItems) return 0;
    return selectedPO.lineItems.reduce((sum, li) => sum + (li.quantity || 0), 0);
  }, [selectedPO]);

  const totalPartnerProfitKwd = useMemo(() => {
    if (!selectedPO?.lineItems || !partnerProfitSettings?.settings) return 0;
    let total = 0;
    const profitMap: Record<string, number> = {};
    partnerProfitSettings.settings.forEach(s => {
      profitMap[s.category] = parseFloat(s.profitPerUnit) || 0;
    });
    for (const li of selectedPO.lineItems) {
      const category = itemCategoryMap[li.itemName] || "";
      const profit = profitMap[category] || 0;
      total += profit * (li.quantity || 0);
    }
    return total;
  }, [selectedPO, partnerProfitSettings, itemCategoryMap]);

  const grandTotalKwd = totalFreightKwd + totalPartnerProfitKwd + totalChargesKwd;

  const allocatedLineItems = useMemo(() => {
    if (!selectedPO?.lineItems) return [];
    const freightPerUnit = totalQuantity > 0 ? (totalFreightKwd / totalQuantity) : 0;
    const bankPerUnit = totalQuantity > 0 ? (bankChargesKwd / totalQuantity) : 0;
    const packingPerUnit = totalQuantity > 0 ? (packingChargesKwd / totalQuantity) : 0;

    const profitMap: Record<string, number> = {};
    partnerProfitSettings?.settings?.forEach(s => {
      profitMap[s.category] = parseFloat(s.profitPerUnit) || 0;
    });

    return selectedPO.lineItems.map(li => {
      const category = itemCategoryMap[li.itemName] || "";
      const partnerProfitPerUnit = profitMap[category] || 0;
      const unitPriceKwd = parseDecimal(li.priceKwd);
      const landedCostPerUnit = unitPriceKwd + freightPerUnit + partnerProfitPerUnit + bankPerUnit + packingPerUnit;
      const qty = li.quantity || 0;

      return {
        purchaseOrderLineItemId: li.id,
        itemName: li.itemName,
        itemCategory: category,
        quantity: qty,
        unitPriceKwd: unitPriceKwd.toFixed(3),
        lineTotalKwd: (unitPriceKwd * qty).toFixed(3),
        freightPerUnitKwd: freightPerUnit.toFixed(3),
        partnerProfitPerUnitKwd: partnerProfitPerUnit.toFixed(3),
        bankChargesPerUnitKwd: bankPerUnit.toFixed(3),
        packingPerUnitKwd: packingPerUnit.toFixed(3),
        landedCostPerUnitKwd: landedCostPerUnit.toFixed(3),
        totalLandedCostKwd: (landedCostPerUnit * qty).toFixed(3),
      };
    });
  }, [selectedPO, totalFreightKwd, bankChargesKwd, packingChargesKwd, totalQuantity, partnerProfitSettings, itemCategoryMap]);

  const createMutation = useMutation({
    mutationFn: async (data: { voucher: any; lineItems: any[] }) => {
      return apiRequest("POST", "/api/landed-cost-vouchers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landed-cost-vouchers"] });
      toast({ title: "Voucher Created", description: "Landed cost voucher has been saved." });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create voucher.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; voucher: any; lineItems: any[] }) => {
      return apiRequest("PUT", `/api/landed-cost-vouchers/${data.id}`, {
        voucher: data.voucher,
        lineItems: data.lineItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landed-cost-vouchers"] });
      toast({ title: "Voucher Updated", description: "Landed cost voucher has been updated." });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update voucher.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!selectedPOId) {
      toast({ title: "Error", description: "Please select a purchase order.", variant: "destructive" });
      return;
    }

    const voucherData = {
      voucherNumber: isEditing ? voucher.voucherNumber : (nextNumber?.voucherNumber || "LCV-0001"),
      purchaseOrderId: selectedPOId,
      voucherDate,
      hkToDxbAmount: hkToDxbAmount || null,
      hkToDxbCurrency,
      hkToDxbFxRate: hkToDxbFxRate || null,
      hkToDxbKwd: hkToDxbKwd.toFixed(3),
      dxbToKwiAmount: dxbToKwiAmount || null,
      dxbToKwiCurrency,
      dxbToKwiFxRate: dxbToKwiFxRate || null,
      dxbToKwiKwd: dxbToKwiKwd.toFixed(3),
      totalPartnerProfitKwd: totalPartnerProfitKwd.toFixed(3),
      bankChargesAmount: bankChargesAmount || null,
      bankChargesCurrency,
      bankChargesFxRate: bankChargesFxRate || null,
      bankChargesKwd: bankChargesKwd.toFixed(3),
      packingChargesAmount: packingChargesAmount || null,
      packingChargesCurrency,
      packingChargesFxRate: packingChargesFxRate || null,
      packingChargesKwd: packingChargesKwd.toFixed(3),
      totalFreightKwd: totalFreightKwd.toFixed(3),
      totalChargesKwd: totalChargesKwd.toFixed(3),
      grandTotalKwd: grandTotalKwd.toFixed(3),
      allocationMethod,
      notes: notes || null,
      branchId: branchId || null,
    };

    if (isEditing) {
      updateMutation.mutate({
        id: voucher.id,
        voucher: voucherData,
        lineItems: allocatedLineItems,
      });
    } else {
      createMutation.mutate({
        voucher: voucherData,
        lineItems: allocatedLineItems,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {isEditing ? `Edit Voucher ${voucher.voucherNumber}` : "New Landed Cost Voucher"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Voucher Number</Label>
                <Input
                  value={isEditing ? voucher.voucherNumber : (nextNumber?.voucherNumber || "LCV-0001")}
                  disabled
                  className="h-8"
                  data-testid="input-voucher-number"
                />
              </div>
              <div className="space-y-2">
                <Label>Voucher Date</Label>
                <Input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="h-8"
                  data-testid="input-voucher-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Order *</Label>
                <Select
                  value={selectedPOId?.toString() || ""}
                  onValueChange={(v) => setSelectedPOId(parseInt(v))}
                  disabled={isEditing}
                >
                  <SelectTrigger className="h-8" data-testid="select-purchase-order">
                    <SelectValue placeholder="Select PO..." />
                  </SelectTrigger>
                  <SelectContent>
                    {purchases.map(po => (
                      <SelectItem key={po.id} value={po.id.toString()}>
                        {po.invoiceNumber || `PO #${po.id}`} - {po.supplier?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Freight Leg 1: HK to Dubai
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={hkToDxbAmount}
                        onChange={(e) => setHkToDxbAmount(e.target.value)}
                        className="h-8"
                        data-testid="input-hk-dxb-amount"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Currency</Label>
                      <Select value={hkToDxbCurrency} onValueChange={setHkToDxbCurrency}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">FX Rate</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={hkToDxbFxRate}
                        onChange={(e) => setHkToDxbFxRate(e.target.value)}
                        className="h-8"
                        data-testid="input-hk-dxb-rate"
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-muted-foreground">KWD: </span>
                    <span className="font-mono font-semibold">{formatCurrency(hkToDxbKwd)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Freight Leg 2: Dubai to Kuwait
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dxbToKwiAmount}
                        onChange={(e) => setDxbToKwiAmount(e.target.value)}
                        className="h-8"
                        data-testid="input-dxb-kwi-amount"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Currency</Label>
                      <Select value={dxbToKwiCurrency} onValueChange={setDxbToKwiCurrency}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">FX Rate</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={dxbToKwiFxRate}
                        onChange={(e) => setDxbToKwiFxRate(e.target.value)}
                        className="h-8"
                        data-testid="input-dxb-kwi-rate"
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-muted-foreground">KWD: </span>
                    <span className="font-mono font-semibold">{formatCurrency(dxbToKwiKwd)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Bank / FX Charges
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bankChargesAmount}
                        onChange={(e) => setBankChargesAmount(e.target.value)}
                        className="h-8"
                        data-testid="input-bank-amount"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Currency</Label>
                      <Select value={bankChargesCurrency} onValueChange={setBankChargesCurrency}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">FX Rate</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={bankChargesFxRate}
                        onChange={(e) => setBankChargesFxRate(e.target.value)}
                        className="h-8"
                        data-testid="input-bank-rate"
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-muted-foreground">KWD: </span>
                    <span className="font-mono font-semibold">{formatCurrency(bankChargesKwd)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Packing Charges
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={packingChargesAmount}
                        onChange={(e) => setPackingChargesAmount(e.target.value)}
                        className="h-8"
                        data-testid="input-packing-amount"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Currency</Label>
                      <Select value={packingChargesCurrency} onValueChange={setPackingChargesCurrency}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">FX Rate</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={packingChargesFxRate}
                        onChange={(e) => setPackingChargesFxRate(e.target.value)}
                        className="h-8"
                        data-testid="input-packing-rate"
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-muted-foreground">KWD: </span>
                    <span className="font-mono font-semibold">{formatCurrency(packingChargesKwd)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Freight</div>
                    <div className="font-mono font-semibold">{formatCurrency(totalFreightKwd)} KWD</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Partner Profit</div>
                    <div className="font-mono font-semibold">{formatCurrency(totalPartnerProfitKwd)} KWD</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Bank Charges</div>
                    <div className="font-mono font-semibold">{formatCurrency(bankChargesKwd)} KWD</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Packing</div>
                    <div className="font-mono font-semibold">{formatCurrency(packingChargesKwd)} KWD</div>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <div className="text-muted-foreground">Grand Total</div>
                    <div className="font-mono font-bold text-lg">{formatCurrency(grandTotalKwd)} KWD</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedPO && allocatedLineItems.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Per-Item Landed Cost Allocation</span>
                    <Badge variant="secondary">{totalQuantity} units</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Costs are allocated equally per unit across all items
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2">Item</TableHead>
                        <TableHead className="py-2">Category</TableHead>
                        <TableHead className="py-2 text-right">Qty</TableHead>
                        <TableHead className="py-2 text-right">Unit Price</TableHead>
                        <TableHead className="py-2 text-right">Freight/Unit</TableHead>
                        <TableHead className="py-2 text-right">Partner/Unit</TableHead>
                        <TableHead className="py-2 text-right">Landed Cost/Unit</TableHead>
                        <TableHead className="py-2 text-right">Total Landed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocatedLineItems.map((li, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="py-1 text-xs">{li.itemName}</TableCell>
                          <TableCell className="py-1">
                            <Badge variant="outline" className="text-xs">{li.itemCategory || "N/A"}</Badge>
                          </TableCell>
                          <TableCell className="py-1 text-right font-mono">{li.quantity}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{li.unitPriceKwd}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{li.freightPerUnitKwd}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{li.partnerProfitPerUnitKwd}</TableCell>
                          <TableCell className="py-1 text-right font-mono font-semibold">{li.landedCostPerUnitKwd}</TableCell>
                          <TableCell className="py-1 text-right font-mono font-semibold">{li.totalLandedCostKwd}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this shipment..."
                rows={2}
                data-testid="input-notes"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !selectedPOId} data-testid="button-save-voucher">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEditing ? "Update Voucher" : "Create Voucher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface LandedCostViewDialogProps {
  voucher: LandedCostVoucherWithDetails;
  onClose: () => void;
}

function LandedCostViewDialog({ voucher, onClose }: LandedCostViewDialogProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Voucher {voucher.voucherNumber}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Date</div>
                <div>{format(new Date(voucher.voucherDate), "dd/MM/yyyy")}</div>
              </div>
              <div>
                <div className="text-muted-foreground">PO Reference</div>
                <div>{voucher.purchaseOrder?.invoiceNumber || `PO #${voucher.purchaseOrderId}`}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Allocation Method</div>
                <div className="capitalize">{voucher.allocationMethod}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Items</div>
                <div>{voucher.lineItems?.length || 0}</div>
              </div>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HK to Dubai Freight:</span>
                      <span className="font-mono">
                        {voucher.hkToDxbAmount} {voucher.hkToDxbCurrency} = {formatCurrency(voucher.hkToDxbKwd)} KWD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dubai to Kuwait Freight:</span>
                      <span className="font-mono">
                        {voucher.dxbToKwiAmount} {voucher.dxbToKwiCurrency} = {formatCurrency(voucher.dxbToKwiKwd)} KWD
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total Freight:</span>
                      <span className="font-mono">{formatCurrency(voucher.totalFreightKwd)} KWD</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Partner Profit:</span>
                      <span className="font-mono">{formatCurrency(voucher.totalPartnerProfitKwd)} KWD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank Charges:</span>
                      <span className="font-mono">{formatCurrency(voucher.bankChargesKwd)} KWD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Packing Charges:</span>
                      <span className="font-mono">{formatCurrency(voucher.packingChargesKwd)} KWD</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Grand Total:</span>
                      <span className="font-mono">{formatCurrency(voucher.grandTotalKwd)} KWD</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {voucher.lineItems && voucher.lineItems.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Landed Cost Per Item</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2">Item</TableHead>
                        <TableHead className="py-2">Category</TableHead>
                        <TableHead className="py-2 text-right">Qty</TableHead>
                        <TableHead className="py-2 text-right">Unit Price</TableHead>
                        <TableHead className="py-2 text-right">Freight/Unit</TableHead>
                        <TableHead className="py-2 text-right">Partner/Unit</TableHead>
                        <TableHead className="py-2 text-right">Landed/Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucher.lineItems.map((li) => (
                        <TableRow key={li.id}>
                          <TableCell className="py-1 text-xs">{li.itemName}</TableCell>
                          <TableCell className="py-1">
                            <Badge variant="outline" className="text-xs">{li.itemCategory || "N/A"}</Badge>
                          </TableCell>
                          <TableCell className="py-1 text-right font-mono">{li.quantity}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{formatCurrency(li.unitPriceKwd)}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{formatCurrency(li.freightPerUnitKwd)}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{formatCurrency(li.partnerProfitPerUnitKwd)}</TableCell>
                          <TableCell className="py-1 text-right font-mono font-semibold">{formatCurrency(li.landedCostPerUnitKwd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {voucher.notes && (
              <div>
                <Label className="text-muted-foreground">Notes</Label>
                <p className="text-sm mt-1">{voucher.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
