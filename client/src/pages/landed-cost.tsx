import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, Eye, Trash2, Plus, Calculator, Package, DollarSign, Truck, Pencil, Users, Banknote, HandCoins } from "lucide-react";
import { format } from "date-fns";
import type { LandedCostVoucherWithDetails, PurchaseOrderWithDetails, Item, Supplier } from "@shared/schema";

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
  const [payVoucher, setPayVoucher] = useState<LandedCostVoucherWithDetails | null>(null);
  const [showPartnerSettlements, setShowPartnerSettlements] = useState(false);

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
      v.purchaseOrder?.invoiceNumber?.toLowerCase().includes(q) ||
      v.purchaseOrders?.some(po => po.invoiceNumber?.toLowerCase().includes(q))
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowPartnerSettlements(true)} data-testid="button-partner-settlements">
            <HandCoins className="h-4 w-4 mr-2" />
            Partner Settlements
          </Button>
          <Button onClick={() => { setEditingVoucher(null); setShowForm(true); }} data-testid="button-new-voucher">
            <Plus className="h-4 w-4 mr-2" />
            New Voucher
          </Button>
        </div>
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
                <TableHead className="py-2">Pay To</TableHead>
                <TableHead className="py-2 text-right">Grand Total</TableHead>
                <TableHead className="py-2">Status</TableHead>
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
                      {v.purchaseOrders && v.purchaseOrders.length > 0
                        ? v.purchaseOrders.length > 1
                          ? <span title={v.purchaseOrders.map(po => po.invoiceNumber || `PO #${po.id}`).join(", ")}>{v.purchaseOrders.length} POs</span>
                          : v.purchaseOrders[0].invoiceNumber || `PO #${v.purchaseOrders[0].id}`
                        : v.purchaseOrder?.invoiceNumber || `PO #${v.purchaseOrderId}`}
                    </TableCell>
                    <TableCell className="py-1">
                      <div className="text-xs space-y-0.5">
                        {v.party && <div>Freight: {v.party.name}</div>}
                        {v.partnerParty && <div>Partner: {v.partnerParty.name}</div>}
                        {!v.party && !v.partnerParty && "-"}
                      </div>
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono font-semibold">
                      {formatCurrency(v.grandTotalKwd)} KWD
                    </TableCell>
                    <TableCell className="py-1">
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={v.payableStatus === "paid" ? "default" : "secondary"} className="text-xs">
                          Freight: {v.payableStatus === "paid" ? "Paid" : "Pending"}
                        </Badge>
                        {v.partnerParty && parseFloat(v.totalPartnerProfitKwd || "0") > 0 && (
                          <Badge variant={v.partnerPayableStatus === "paid" ? "default" : "secondary"} className="text-xs">
                            Partner: {v.partnerPayableStatus === "paid" ? "Paid" : "Pending"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <Badge variant="secondary">{v.lineItems?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {v.payableStatus === "pending" && v.party && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setPayVoucher(v)}
                            data-testid={`button-pay-${v.id}`}
                            title="Record Payment"
                          >
                            <Banknote className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
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

      {payVoucher && (
        <PayLandedCostDialog
          voucher={payVoucher}
          onClose={() => setPayVoucher(null)}
        />
      )}

      {showPartnerSettlements && (
        <PartnerSettlementsDialog
          onClose={() => setShowPartnerSettlements(false)}
        />
      )}
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

  // Multi-PO selection: use purchaseOrders array if available, fallback to single purchaseOrderId
  const getInitialPOIds = useCallback(() => {
    if (voucher?.purchaseOrders?.length) {
      return voucher.purchaseOrders.map(po => po.id);
    }
    return voucher?.purchaseOrderId ? [voucher.purchaseOrderId] : [];
  }, [voucher]);
  
  const [selectedPOIds, setSelectedPOIds] = useState<number[]>(getInitialPOIds);
  
  // Sync PO IDs when voucher changes (e.g., when dialog opens with different voucher)
  useEffect(() => {
    setSelectedPOIds(getInitialPOIds());
  }, [voucher?.id, getInitialPOIds]);
  const [voucherDate, setVoucherDate] = useState(voucher?.voucherDate || new Date().toISOString().split("T")[0]);
  const [allocationMethod, setAllocationMethod] = useState(voucher?.allocationMethod || "quantity");
  const [notes, setNotes] = useState(voucher?.notes || "");
  const [partyId, setPartyId] = useState<number | null>(voucher?.partyId || null);
  const [partnerPartyId, setPartnerPartyId] = useState<number | null>(voucher?.partnerPartyId || null);

  const [hkToDxbAmount, setHkToDxbAmount] = useState(voucher?.hkToDxbAmount || "");
  const [hkToDxbCurrency, setHkToDxbCurrency] = useState(voucher?.hkToDxbCurrency || "USD");
  const [hkToDxbFxRate, setHkToDxbFxRate] = useState(voucher?.hkToDxbFxRate || "0.307");

  const [dxbToKwiAmount, setDxbToKwiAmount] = useState(voucher?.dxbToKwiAmount || "");
  const [dxbToKwiCurrency, setDxbToKwiCurrency] = useState(voucher?.dxbToKwiCurrency || "AED");
  const [dxbToKwiFxRate, setDxbToKwiFxRate] = useState(voucher?.dxbToKwiFxRate || "0.0835");

  const [packingPartyId, setPackingPartyId] = useState<number | null>(voucher?.packingPartyId || null);

  const [partnerProfitAmount, setPartnerProfitAmount] = useState(voucher?.totalPartnerProfitKwd || "");

  const { data: purchasesResponse } = useQuery<{ data: PurchaseOrderWithDetails[]; total: number }>({
    queryKey: ["/api/purchase-orders"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-orders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
      return res.json();
    },
  });
  const purchases = purchasesResponse?.data || [];

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const res = await fetch("/api/items", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch suppliers");
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

  // Multi-PO support: get all selected POs
  const selectedPOs = useMemo(() => {
    return purchases.filter(p => selectedPOIds.includes(p.id));
  }, [purchases, selectedPOIds]);

  // Aggregate all line items from all selected POs
  const aggregatedLineItems = useMemo(() => {
    const allLineItems: any[] = [];
    selectedPOs.forEach(po => {
      if (po.lineItems) {
        po.lineItems.forEach(li => {
          allLineItems.push({ ...li, poId: po.id, poInvoiceNumber: po.invoiceNumber });
        });
      }
    });
    return allLineItems;
  }, [selectedPOs]);

  const hkToDxbKwd = parseDecimal(hkToDxbAmount);
  const dxbToKwiKwd = parseDecimal(dxbToKwiAmount);
  const partnerProfitKwd = parseDecimal(partnerProfitAmount);

  const totalFreightKwd = hkToDxbKwd + dxbToKwiKwd;

  const totalQuantity = useMemo(() => {
    if (aggregatedLineItems.length === 0) return 0;
    return aggregatedLineItems.reduce((sum, li) => sum + (li.quantity || 0), 0);
  }, [aggregatedLineItems]);

  // Packing charges: fixed 0.210 KWD per unit
  const PACKING_RATE_PER_UNIT = 0.210;
  const packingChargesKwd = totalQuantity * PACKING_RATE_PER_UNIT;

  const grandTotalKwd = totalFreightKwd + partnerProfitKwd + packingChargesKwd;

  const allocatedLineItems = useMemo(() => {
    if (aggregatedLineItems.length === 0) return [];
    const freightPerUnit = totalQuantity > 0 ? (totalFreightKwd / totalQuantity) : 0;
    const partnerProfitPerUnit = totalQuantity > 0 ? (partnerProfitKwd / totalQuantity) : 0;
    const packingPerUnit = PACKING_RATE_PER_UNIT; // Fixed 0.210 KWD per unit

    return aggregatedLineItems.map(li => {
      const category = itemCategoryMap[li.itemName] || "";
      const unitPriceKwd = parseDecimal(li.priceKwd);
      const landedCostPerUnit = unitPriceKwd + freightPerUnit + partnerProfitPerUnit + packingPerUnit;
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
        packingPerUnitKwd: packingPerUnit.toFixed(3),
        landedCostPerUnitKwd: landedCostPerUnit.toFixed(3),
        totalLandedCostKwd: (landedCostPerUnit * qty).toFixed(3),
      };
    });
  }, [aggregatedLineItems, totalFreightKwd, partnerProfitKwd, totalQuantity, itemCategoryMap]);

  const createMutation = useMutation({
    mutationFn: async (data: { voucher: any; lineItems: any[]; purchaseOrderIds: number[] }) => {
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
    mutationFn: async (data: { id: number; voucher: any; lineItems: any[]; purchaseOrderIds: number[] }) => {
      return apiRequest("PUT", `/api/landed-cost-vouchers/${data.id}`, {
        voucher: data.voucher,
        lineItems: data.lineItems,
        purchaseOrderIds: data.purchaseOrderIds,
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
    if (selectedPOIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one purchase order.", variant: "destructive" });
      return;
    }

    // For backward compatibility, use first PO ID as legacy purchaseOrderId
    const primaryPOId = selectedPOIds[0];

    const voucherData = {
      voucherNumber: isEditing ? voucher.voucherNumber : (nextNumber?.voucherNumber || "LCV-0001"),
      purchaseOrderId: primaryPOId,
      voucherDate,
      hkToDxbAmount: hkToDxbAmount || null,
      hkToDxbCurrency: "KWD",
      hkToDxbFxRate: "1",
      hkToDxbKwd: hkToDxbKwd.toFixed(3),
      dxbToKwiAmount: dxbToKwiAmount || null,
      dxbToKwiCurrency: "KWD",
      dxbToKwiFxRate: "1",
      dxbToKwiKwd: dxbToKwiKwd.toFixed(3),
      totalPartnerProfitKwd: partnerProfitKwd.toFixed(3),
      packingChargesKwd: packingChargesKwd.toFixed(3),
      totalFreightKwd: totalFreightKwd.toFixed(3),
      totalChargesKwd: packingChargesKwd.toFixed(3),
      grandTotalKwd: grandTotalKwd.toFixed(3),
      allocationMethod,
      partyId: partyId || null,
      partnerPartyId: partnerPartyId || null,
      packingPartyId: packingPartyId || null,
      payableStatus: "pending",
      partnerPayableStatus: partnerPartyId && partnerProfitKwd > 0 ? "pending" : "paid",
      packingPayableStatus: packingPartyId && packingChargesKwd > 0 ? "pending" : "paid",
      notes: notes || null,
      branchId: branchId || null,
    };

    if (isEditing) {
      updateMutation.mutate({
        id: voucher.id,
        voucher: voucherData,
        lineItems: allocatedLineItems,
        purchaseOrderIds: selectedPOIds,
      });
    } else {
      createMutation.mutate({
        voucher: voucherData,
        lineItems: allocatedLineItems,
        purchaseOrderIds: selectedPOIds,
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
            <div className="grid gap-4 md:grid-cols-5">
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
              <div className="space-y-2 md:col-span-2">
                <Label>Purchase Orders * ({selectedPOIds.length} selected)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full h-8 justify-start font-normal" 
                      data-testid="button-select-purchase-orders"
                      disabled={isEditing}
                    >
                      {selectedPOIds.length === 0 
                        ? "Select PO(s)..." 
                        : selectedPOIds.length === 1 
                          ? purchases.find(p => p.id === selectedPOIds[0])?.invoiceNumber || `PO #${selectedPOIds[0]}`
                          : `${selectedPOIds.length} POs selected`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <ScrollArea className="h-64 p-2">
                      <div className="space-y-1">
                        {purchases.map(po => (
                          <div 
                            key={po.id} 
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate ${selectedPOIds.includes(po.id) ? 'bg-accent' : ''}`}
                            onClick={() => {
                              if (isEditing) return;
                              setSelectedPOIds(prev => 
                                prev.includes(po.id) 
                                  ? prev.filter(id => id !== po.id)
                                  : [...prev, po.id]
                              );
                            }}
                            data-testid={`checkbox-po-${po.id}`}
                          >
                            <Checkbox 
                              checked={selectedPOIds.includes(po.id)}
                              disabled={isEditing}
                            />
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{po.invoiceNumber || `PO #${po.id}`}</div>
                              <div className="text-xs text-muted-foreground">{po.supplier?.name} - {po.lineItems?.reduce((sum, li) => sum + (li.quantity || 0), 0)} units</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Logistics Company (Freight)</Label>
                <Select
                  value={partyId?.toString() || ""}
                  onValueChange={(v) => setPartyId(v ? parseInt(v) : null)}
                >
                  <SelectTrigger className="h-8" data-testid="select-party">
                    <SelectValue placeholder="Select logistics..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Partner Company (Profit)</Label>
                <Select
                  value={partnerPartyId?.toString() || ""}
                  onValueChange={(v) => setPartnerPartyId(v ? parseInt(v) : null)}
                >
                  <SelectTrigger className="h-8" data-testid="select-partner-party">
                    <SelectValue placeholder="Select partner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  HK to Dubai (KWD)
                </Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={hkToDxbAmount}
                  onChange={(e) => setHkToDxbAmount(e.target.value)}
                  className="h-8"
                  data-testid="input-hk-dxb-amount"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Dubai to Kuwait (KWD)
                </Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={dxbToKwiAmount}
                  onChange={(e) => setDxbToKwiAmount(e.target.value)}
                  className="h-8"
                  data-testid="input-dxb-kwi-amount"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Partner Profit (KWD)
                </Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={partnerProfitAmount}
                  onChange={(e) => setPartnerProfitAmount(e.target.value)}
                  className="h-8"
                  data-testid="input-partner-profit"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Packing Party
                </Label>
                <Select
                  value={packingPartyId?.toString() || ""}
                  onValueChange={(v) => setPackingPartyId(v ? parseInt(v) : null)}
                >
                  <SelectTrigger className="h-8" data-testid="select-packing-party">
                    <SelectValue placeholder="Select packing..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Packing (0.210/unit)
                </Label>
                <Input
                  type="text"
                  value={`${formatCurrency(packingChargesKwd)} KWD`}
                  disabled
                  className="h-8 bg-muted"
                  data-testid="input-packing-amount"
                />
              </div>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Freight</div>
                    <div className="font-mono font-semibold">{formatCurrency(totalFreightKwd)} KWD</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Partner Profit</div>
                    <div className="font-mono font-semibold">{formatCurrency(partnerProfitKwd)} KWD</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Packing ({totalQuantity} x 0.210)</div>
                    <div className="font-mono font-semibold">{formatCurrency(packingChargesKwd)} KWD</div>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <div className="text-muted-foreground">Grand Total</div>
                    <div className="font-mono font-bold text-lg">{formatCurrency(grandTotalKwd)} KWD</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedPOIds.length > 0 && allocatedLineItems.length > 0 && (
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
          <Button onClick={handleSubmit} disabled={isPending || selectedPOIds.length === 0} data-testid="button-save-voucher">
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
                <div className="text-muted-foreground">PO Reference(s)</div>
                <div>
                  {voucher.purchaseOrders && voucher.purchaseOrders.length > 0
                    ? voucher.purchaseOrders.map(po => po.invoiceNumber || `PO #${po.id}`).join(", ")
                    : voucher.purchaseOrder?.invoiceNumber || `PO #${voucher.purchaseOrderId}`}
                </div>
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

interface PayLandedCostDialogProps {
  voucher: LandedCostVoucherWithDetails;
  onClose: () => void;
}

function PayLandedCostDialog({ voucher, onClose }: PayLandedCostDialogProps) {
  const { toast } = useToast();
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState<string>("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState(`Payment for ${voucher.voucherNumber}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payMutation = useMutation({
    mutationFn: async () => {
      // First create a payment OUT to the supplier (matching payments.tsx format)
      const paymentData = {
        paymentDate,
        direction: "OUT",
        customerId: null,
        supplierId: voucher.partyId,
        purchaseOrderId: null,
        paymentType,
        amount: voucher.grandTotalKwd || "0",
        fxCurrency: null,
        fxRate: null,
        fxAmount: null,
        reference: reference || null,
        notes: notes || null,
      };

      const paymentRes = await apiRequest("POST", "/api/payments", paymentData);
      if (!paymentRes.ok) {
        const err = await paymentRes.json();
        throw new Error(err.error || "Failed to create payment");
      }
      const payment = await paymentRes.json();

      // Then link the payment to the voucher
      const linkRes = await apiRequest("POST", `/api/landed-cost-vouchers/${voucher.id}/pay`, {
        paymentId: payment.id,
      });
      if (!linkRes.ok) {
        const err = await linkRes.json();
        throw new Error(err.error || "Failed to link payment to voucher");
      }

      return payment;
    },
    onSuccess: () => {
      // Invalidate all landed cost voucher queries (matches any branch filter)
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/landed-cost-vouchers")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/payments")
      });
      toast({ title: "Payment recorded and voucher marked as paid" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    setIsSubmitting(true);
    payMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment for {voucher.voucherNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pay To:</span>
              <span className="font-medium">{voucher.party?.name}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono font-semibold">{formatCurrency(voucher.grandTotalKwd)} KWD</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8"
                data-testid="input-payment-date"
              />
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="h-8" data-testid="select-payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="NBK Bank">NBK Bank</SelectItem>
                  <SelectItem value="CBK Bank">CBK Bank</SelectItem>
                  <SelectItem value="Knet">Knet</SelectItem>
                  <SelectItem value="Wamd">Wamd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Reference (Optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Cheque number or TT reference"
              className="h-8"
              data-testid="input-reference"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              data-testid="input-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={payMutation.isPending || isSubmitting}
            data-testid="button-submit-payment"
          >
            {payMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4 mr-2" />
                Record Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PartnerSettlementsDialogProps {
  onClose: () => void;
}

function PartnerSettlementsDialog({ onClose }: PartnerSettlementsDialogProps) {
  const { toast } = useToast();
  const [selectedVouchers, setSelectedVouchers] = useState<number[]>([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const { data: pendingPayables = [], isLoading } = useQuery<LandedCostVoucherWithDetails[]>({
    queryKey: ["/api/partner-profit-payables"],
    queryFn: async () => {
      const res = await fetch("/api/partner-profit-payables", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pending payables");
      return res.json();
    },
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
  });

  const groupedByPartner = useMemo(() => {
    const map = new Map<number, { partner: Supplier; vouchers: LandedCostVoucherWithDetails[]; totalProfit: number }>();
    pendingPayables.forEach(v => {
      if (!v.partnerPartyId || !v.partnerParty) return;
      const existing = map.get(v.partnerPartyId);
      const profit = parseFloat(v.totalPartnerProfitKwd || "0");
      if (existing) {
        existing.vouchers.push(v);
        existing.totalProfit += profit;
      } else {
        map.set(v.partnerPartyId, {
          partner: v.partnerParty,
          vouchers: [v],
          totalProfit: profit,
        });
      }
    });
    return Array.from(map.values());
  }, [pendingPayables]);

  const selectedTotal = useMemo(() => {
    return pendingPayables
      .filter(v => selectedVouchers.includes(v.id))
      .reduce((sum, v) => sum + parseFloat(v.totalPartnerProfitKwd || "0"), 0);
  }, [pendingPayables, selectedVouchers]);

  const selectedPartnerId = useMemo(() => {
    const selected = pendingPayables.find(v => selectedVouchers.includes(v.id));
    return selected?.partnerPartyId || null;
  }, [pendingPayables, selectedVouchers]);

  const selectedPartner = useMemo(() => {
    const selected = pendingPayables.find(v => selectedVouchers.includes(v.id));
    return selected?.partnerParty || null;
  }, [pendingPayables, selectedVouchers]);

  const bulkPayMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPartnerId || selectedVouchers.length === 0) {
        throw new Error("No vouchers selected");
      }
      const paymentPayload = {
        date: paymentDate,
        type: paymentType,
        amount: selectedTotal.toFixed(3),
        direction: "OUT",
        supplierId: selectedPartnerId,
        customerId: null,
        invoiceNumbers: null,
        reference: reference || `Partner Profit Settlement - ${selectedVouchers.length} vouchers`,
        notes: notes || null,
        currency: "KWD",
        fxRate: null,
        amountForeign: null,
        branchId: null,
      };
      const paymentRes = await apiRequest("POST", "/api/payments", paymentPayload);
      if (!paymentRes.ok) {
        const err = await paymentRes.json();
        throw new Error(err.error || "Failed to create payment");
      }
      const payment = await paymentRes.json();
      for (const voucherId of selectedVouchers) {
        const linkRes = await apiRequest("POST", `/api/landed-cost-vouchers/${voucherId}/pay-partner`, {
          paymentId: payment.id,
        });
        if (!linkRes.ok) {
          const err = await linkRes.json();
          throw new Error(err.error || "Failed to mark voucher as paid");
        }
      }
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/landed-cost")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/partner-profit-payables")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).startsWith("/api/payments")
      });
      toast({ title: "Partner Profit Settled", description: `${selectedVouchers.length} voucher(s) marked as paid.` });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleVoucher = (voucherId: number, partnerPartyId: number) => {
    if (selectedPartnerId && selectedPartnerId !== partnerPartyId) {
      toast({ title: "Info", description: "You can only select vouchers from the same partner.", variant: "default" });
      return;
    }
    setSelectedVouchers(prev => 
      prev.includes(voucherId) 
        ? prev.filter(id => id !== voucherId)
        : [...prev, voucherId]
    );
  };

  const selectAllForPartner = (partnerId: number) => {
    if (selectedPartnerId && selectedPartnerId !== partnerId) {
      setSelectedVouchers([]);
    }
    const partnerVouchers = pendingPayables.filter(v => v.partnerPartyId === partnerId).map(v => v.id);
    setSelectedVouchers(partnerVouchers);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            Partner Profit Settlements
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : groupedByPartner.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending partner profit settlements
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByPartner.map(({ partner, vouchers, totalProfit }) => (
                <Card key={partner.id}>
                  <CardHeader className="py-3 flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{partner.name}</CardTitle>
                      <CardDescription>
                        {vouchers.length} voucher(s) - Total: {totalProfit.toFixed(3)} KWD
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllForPartner(partner.id)}
                      data-testid={`button-select-all-${partner.id}`}
                    >
                      Select All
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="py-2 w-10"></TableHead>
                          <TableHead className="py-2">Voucher</TableHead>
                          <TableHead className="py-2">Date</TableHead>
                          <TableHead className="py-2">PO Reference</TableHead>
                          <TableHead className="py-2 text-right">Partner Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vouchers.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="py-1">
                              <Checkbox
                                checked={selectedVouchers.includes(v.id)}
                                onCheckedChange={() => toggleVoucher(v.id, v.partnerPartyId!)}
                                data-testid={`checkbox-voucher-${v.id}`}
                              />
                            </TableCell>
                            <TableCell className="py-1 font-medium">{v.voucherNumber}</TableCell>
                            <TableCell className="py-1">{format(new Date(v.voucherDate), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="py-1">
                              {v.purchaseOrders && v.purchaseOrders.length > 0
                                ? v.purchaseOrders.length > 1
                                  ? `${v.purchaseOrders.length} POs`
                                  : v.purchaseOrders[0].invoiceNumber || `PO #${v.purchaseOrders[0].id}`
                                : v.purchaseOrder?.invoiceNumber || `PO #${v.purchaseOrderId}`}
                            </TableCell>
                            <TableCell className="py-1 text-right font-mono">{formatCurrency(v.totalPartnerProfitKwd)} KWD</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}

              {selectedVouchers.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Payment Details</CardTitle>
                    <CardDescription>
                      Paying {selectedPartner?.name} for {selectedVouchers.length} voucher(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded-md mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pay To:</span>
                        <span className="font-medium">{selectedPartner?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-mono font-semibold">{selectedTotal.toFixed(3)} KWD</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Payment Date</Label>
                        <Input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="h-8"
                          data-testid="input-partner-payment-date"
                        />
                      </div>
                      <div>
                        <Label>Payment Type</Label>
                        <Select value={paymentType} onValueChange={setPaymentType}>
                          <SelectTrigger className="h-8" data-testid="select-partner-payment-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="NBK Bank">NBK Bank</SelectItem>
                            <SelectItem value="CBK Bank">CBK Bank</SelectItem>
                            <SelectItem value="Knet">Knet</SelectItem>
                            <SelectItem value="Wamd">Wamd</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Reference (Optional)</Label>
                      <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g., TT reference"
                        className="h-8"
                        data-testid="input-partner-reference"
                      />
                    </div>

                    <div className="mt-4">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        data-testid="input-partner-notes"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {selectedVouchers.length > 0 && (
            <Button
              onClick={() => bulkPayMutation.mutate()}
              disabled={bulkPayMutation.isPending}
              data-testid="button-settle-partner-profit"
            >
              {bulkPayMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Banknote className="h-4 w-4 mr-2" />
                  Settle {selectedVouchers.length} Voucher(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
