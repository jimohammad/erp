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
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, Eye, Trash2, Plus, Calculator, Package, Truck, Pencil, Users, Banknote, X, ChevronRight } from "lucide-react";
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

type PanelMode = "closed" | "create" | "edit" | "view";

export default function LandedCostPage() {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const [searchQuery, setSearchQuery] = useState("");
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [selectedVoucher, setSelectedVoucher] = useState<LandedCostVoucherWithDetails | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showMonthlySettlements, setShowMonthlySettlements] = useState(false);
  const [payVoucher, setPayVoucher] = useState<LandedCostVoucherWithDetails | null>(null);

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
      if (selectedVoucher?.id === deleteId) {
        setPanelMode("closed");
        setSelectedVoucher(null);
      }
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

  const handleNewVoucher = () => {
    setSelectedVoucher(null);
    setPanelMode("create");
  };

  const handleEditVoucher = (v: LandedCostVoucherWithDetails) => {
    setSelectedVoucher(v);
    setPanelMode("edit");
  };

  const handleViewVoucher = (v: LandedCostVoucherWithDetails) => {
    setSelectedVoucher(v);
    setPanelMode("view");
  };

  const handleClosePanel = () => {
    setPanelMode("closed");
    setSelectedVoucher(null);
  };

  const handleSaveSuccess = () => {
    setPanelMode("closed");
    setSelectedVoucher(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Landed Cost</h1>
          <p className="text-muted-foreground text-sm">
            Track freight, partner profit, and charges
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowMonthlySettlements(true)} data-testid="button-monthly-settlements">
            <Calculator className="h-4 w-4 mr-2" />
            Party Settlements
          </Button>
          <Button onClick={handleNewVoucher} data-testid="button-new-voucher">
            <Plus className="h-4 w-4 mr-2" />
            New Voucher
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Panel: Voucher List */}
        <Card className={`flex flex-col min-h-0 transition-all duration-200 ${panelMode !== "closed" ? "hidden lg:flex lg:w-1/3" : "flex-1"}`}>
          <CardHeader className="py-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vouchers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
                data-testid="input-search"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-1 p-2">
                {filteredVouchers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No vouchers found
                  </div>
                ) : (
                  filteredVouchers.map((v) => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-md cursor-pointer hover-elevate border ${
                        selectedVoucher?.id === v.id ? "bg-accent border-accent" : "border-transparent"
                      }`}
                      onClick={() => handleViewVoucher(v)}
                      data-testid={`row-voucher-${v.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{v.voucherNumber}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(v.voucherDate), "dd/MM/yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {v.purchaseOrders && v.purchaseOrders.length > 0
                              ? v.purchaseOrders.length > 1
                                ? `${v.purchaseOrders.length} POs`
                                : v.purchaseOrders[0].invoiceNumber || `PO #${v.purchaseOrders[0].id}`
                              : v.purchaseOrder?.invoiceNumber || `PO #${v.purchaseOrderId}`}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-sm font-semibold">
                            {formatCurrency(v.grandTotalKwd)}
                          </div>
                          <Badge 
                            variant={v.payableStatus === "paid" ? "default" : "secondary"} 
                            className="text-xs mt-1"
                          >
                            {v.payableStatus === "paid" ? "Paid" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel: Form or View */}
        {panelMode !== "closed" && (
          <Card className="flex-1 lg:w-2/3 flex flex-col min-h-0">
            {panelMode === "view" && selectedVoucher ? (
              <VoucherViewPanel
                voucher={selectedVoucher}
                onClose={handleClosePanel}
                onEdit={() => setPanelMode("edit")}
                onPay={() => setPayVoucher(selectedVoucher)}
                onDelete={() => setDeleteId(selectedVoucher.id)}
              />
            ) : (
              <VoucherFormPanel
                voucher={panelMode === "edit" ? selectedVoucher : null}
                branchId={currentBranch?.id}
                onClose={handleClosePanel}
                onSuccess={handleSaveSuccess}
              />
            )}
          </Card>
        )}
      </div>

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

      {showMonthlySettlements && (
        <MonthlySettlementsDialog
          onClose={() => setShowMonthlySettlements(false)}
        />
      )}
    </div>
  );
}

interface VoucherViewPanelProps {
  voucher: LandedCostVoucherWithDetails;
  onClose: () => void;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}

function VoucherViewPanel({ voucher, onClose, onEdit, onPay, onDelete }: VoucherViewPanelProps) {
  return (
    <>
      <CardHeader className="py-3 flex-shrink-0 border-b">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {voucher.voucherNumber}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {format(new Date(voucher.voucherDate), "dd MMMM yyyy")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {voucher.payableStatus === "pending" && voucher.party && (
              <Button size="sm" variant="outline" onClick={onPay} data-testid="button-pay">
                <Banknote className="h-4 w-4 mr-1" />
                Pay
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onEdit} data-testid="button-edit">
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} data-testid="button-delete">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {/* PO Reference */}
          <div className="p-3 bg-muted/50 rounded-md">
            <div className="text-xs text-muted-foreground mb-1">Purchase Orders</div>
            <div className="font-medium text-sm">
              {voucher.purchaseOrders && voucher.purchaseOrders.length > 0
                ? voucher.purchaseOrders.map(po => po.invoiceNumber || `PO #${po.id}`).join(", ")
                : voucher.purchaseOrder?.invoiceNumber || `PO #${voucher.purchaseOrderId}`}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Cost Breakdown</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3 w-3" /> HK to Dubai
                </div>
                <div className="font-mono font-medium">{formatCurrency(voucher.hkToDxbKwd)} KWD</div>
              </div>
              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Dubai to Kuwait
                </div>
                <div className="font-mono font-medium">{formatCurrency(voucher.dxbToKwiKwd)} KWD</div>
              </div>
              <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/30">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Partner Profit
                </div>
                <div className="font-mono font-medium">{formatCurrency(voucher.totalPartnerProfitKwd)} KWD</div>
              </div>
              <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/30">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" /> Packing
                </div>
                <div className="font-mono font-medium">{formatCurrency(voucher.packingChargesKwd)} KWD</div>
              </div>
            </div>
            <div className="p-3 bg-muted rounded-md flex justify-between items-center">
              <span className="font-medium">Grand Total</span>
              <span className="font-mono font-bold text-lg">{formatCurrency(voucher.grandTotalKwd)} KWD</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex gap-2">
            <Badge variant={voucher.payableStatus === "paid" ? "default" : "secondary"}>
              Freight: {voucher.payableStatus === "paid" ? "Paid" : "Pending"}
            </Badge>
            {voucher.partnerParty && parseFloat(voucher.totalPartnerProfitKwd || "0") > 0 && (
              <Badge variant={voucher.partnerPayableStatus === "paid" ? "default" : "secondary"}>
                Partner: {voucher.partnerPayableStatus === "paid" ? "Paid" : "Pending"}
              </Badge>
            )}
          </div>

          {/* Line Items */}
          {voucher.lineItems && voucher.lineItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Items ({voucher.lineItems.length})
              </div>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2 text-xs">Item</TableHead>
                      <TableHead className="py-2 text-xs text-right">Qty</TableHead>
                      <TableHead className="py-2 text-xs text-right">Landed/Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voucher.lineItems.map((li, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-1 text-xs">{li.itemName}</TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono">{li.quantity}</TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono">{li.landedCostPerUnitKwd}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {voucher.notes && (
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="text-xs text-muted-foreground mb-1">Notes</div>
              <div className="text-sm">{voucher.notes}</div>
            </div>
          )}
        </div>
      </CardContent>
    </>
  );
}

interface VoucherFormPanelProps {
  voucher: LandedCostVoucherWithDetails | null;
  branchId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

function VoucherFormPanel({ voucher, branchId, onClose, onSuccess }: VoucherFormPanelProps) {
  const { toast } = useToast();
  const isEditing = !!voucher;

  const getInitialPOIds = useCallback(() => {
    if (voucher?.purchaseOrders?.length) {
      return voucher.purchaseOrders.map(po => po.id);
    }
    return voucher?.purchaseOrderId ? [voucher.purchaseOrderId] : [];
  }, [voucher]);

  const [selectedPOIds, setSelectedPOIds] = useState<number[]>(getInitialPOIds);
  const [voucherDate, setVoucherDate] = useState(voucher?.voucherDate || new Date().toISOString().split("T")[0]);
  const [hkDxbPartyId, setHkDxbPartyId] = useState<number | null>(voucher?.partyId || null);
  const [dxbKwiPartyId, setDxbKwiPartyId] = useState<number | null>(voucher?.dxbKwiPartyId || null);
  const [partnerPartyId, setPartnerPartyId] = useState<number | null>(voucher?.partnerPartyId || null);
  const [packingPartyId, setPackingPartyId] = useState<number | null>(voucher?.packingPartyId || null);
  const [notes, setNotes] = useState(voucher?.notes || "");
  const [hkToDxbAmount, setHkToDxbAmount] = useState(voucher?.hkToDxbKwd || "");
  const [dxbToKwiAmount, setDxbToKwiAmount] = useState(voucher?.dxbToKwiKwd || "");
  const [partnerProfitAmount, setPartnerProfitAmount] = useState(voucher?.totalPartnerProfitKwd || "");
  const [packingAmount, setPackingAmount] = useState(voucher?.packingChargesKwd || "");

  // Sync all form fields when voucher changes (e.g., when editing a different voucher)
  useEffect(() => {
    setSelectedPOIds(getInitialPOIds());
    setVoucherDate(voucher?.voucherDate || new Date().toISOString().split("T")[0]);
    setHkDxbPartyId(voucher?.partyId || null);
    setDxbKwiPartyId(voucher?.dxbKwiPartyId || null);
    setPartnerPartyId(voucher?.partnerPartyId || null);
    setPackingPartyId(voucher?.packingPartyId || null);
    setNotes(voucher?.notes || "");
    setHkToDxbAmount(voucher?.hkToDxbKwd || "");
    setDxbToKwiAmount(voucher?.dxbToKwiKwd || "");
    setPartnerProfitAmount(voucher?.totalPartnerProfitKwd || "");
    setPackingAmount(voucher?.packingChargesKwd || "");
  }, [voucher?.id, getInitialPOIds]);

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

  // Set default parties for new vouchers based on party type and name
  useEffect(() => {
    if (isEditing || suppliers.length === 0) return;
    
    // DXB→KWI: default to "hiiq party" (logistic type)
    if (!dxbKwiPartyId) {
      const hiiqParty = suppliers.find(s => 
        s.partyType === "logistic" && s.name.toLowerCase().includes("hiiq")
      );
      if (hiiqParty) setDxbKwiPartyId(hiiqParty.id);
    }
    
    // Partner: default to "Muhammad Faisal" (partner type)
    if (!partnerPartyId) {
      const faisalParty = suppliers.find(s => 
        s.partyType === "partner" && s.name.toLowerCase().includes("faisal")
      );
      if (faisalParty) setPartnerPartyId(faisalParty.id);
    }
    
    // Packing Co.: default to "Union Logistics Fzco" (packing type)
    if (!packingPartyId) {
      const unionParty = suppliers.find(s => 
        s.partyType === "packing" && s.name.toLowerCase().includes("union")
      );
      if (unionParty) setPackingPartyId(unionParty.id);
    }
  }, [suppliers, isEditing, dxbKwiPartyId, partnerPartyId, packingPartyId]);

  const itemCategoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach(item => {
      map[item.name] = item.category || "";
    });
    return map;
  }, [items]);

  const { data: nextNumber } = useQuery<{ voucherNumber: string }>({
    queryKey: ["/api/landed-cost-vouchers/next-number"],
    queryFn: async () => {
      const res = await fetch("/api/landed-cost-vouchers/next-number", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to get next number");
      return res.json();
    },
    enabled: !isEditing,
  });

  const selectedPOs = useMemo(() => {
    return purchases.filter(p => selectedPOIds.includes(p.id));
  }, [purchases, selectedPOIds]);

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
  const packingChargesKwd = parseDecimal(packingAmount);

  const totalFreightKwd = hkToDxbKwd + dxbToKwiKwd;
  const grandTotalKwd = totalFreightKwd + partnerProfitKwd + packingChargesKwd;

  const totalQuantity = useMemo(() => {
    // When editing and aggregatedLineItems haven't loaded, use voucher's line items
    if (aggregatedLineItems.length === 0 && isEditing && voucher?.lineItems?.length > 0) {
      return voucher.lineItems.reduce((sum: number, li: any) => sum + (li.quantity || 0), 0);
    }
    if (aggregatedLineItems.length === 0) return 0;
    return aggregatedLineItems.reduce((sum, li) => sum + (li.quantity || 0), 0);
  }, [aggregatedLineItems, isEditing, voucher]);

  const allocatedLineItems = useMemo(() => {
    // When editing and aggregatedLineItems haven't loaded yet, use existing voucher line items
    if (aggregatedLineItems.length === 0 && isEditing && voucher?.lineItems?.length > 0) {
      return voucher.lineItems.map((li: any) => ({
        purchaseOrderLineItemId: li.purchaseOrderLineItemId,
        itemName: li.itemName,
        itemCategory: li.itemCategory || "",
        quantity: li.quantity,
        unitPriceKwd: li.unitPriceKwd,
        lineTotalKwd: li.lineTotalKwd,
        freightPerUnitKwd: li.freightPerUnitKwd,
        partnerProfitPerUnitKwd: li.partnerProfitPerUnitKwd,
        packingPerUnitKwd: li.packingPerUnitKwd,
        landedCostPerUnitKwd: li.landedCostPerUnitKwd,
        totalLandedCostKwd: li.totalLandedCostKwd,
      }));
    }
    
    if (aggregatedLineItems.length === 0) return [];
    const freightPerUnit = totalQuantity > 0 ? (totalFreightKwd / totalQuantity) : 0;
    const partnerProfitPerUnit = totalQuantity > 0 ? (partnerProfitKwd / totalQuantity) : 0;
    const packingPerUnit = totalQuantity > 0 ? (packingChargesKwd / totalQuantity) : 0;

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
  }, [aggregatedLineItems, totalFreightKwd, partnerProfitKwd, packingChargesKwd, totalQuantity, itemCategoryMap, isEditing, voucher]);

  const createMutation = useMutation({
    mutationFn: async (data: { voucher: any; lineItems: any[]; purchaseOrderIds: number[] }) => {
      return apiRequest("POST", "/api/landed-cost-vouchers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landed-cost-vouchers"] });
      toast({ title: "Voucher Created", description: "Landed cost voucher has been saved." });
      onSuccess();
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
      onSuccess();
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
      allocationMethod: "quantity",
      partyId: hkDxbPartyId || null,
      dxbKwiPartyId: dxbKwiPartyId || null,
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
    <>
      <CardHeader className="py-3 flex-shrink-0 border-b">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            {isEditing ? `Edit ${voucher.voucherNumber}` : "New Voucher"}
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {/* Row 1: Basic Info - Voucher #, Date, PO Selection */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Voucher #</Label>
              <Input
                value={isEditing ? voucher.voucherNumber : (nextNumber?.voucherNumber || "LCV-0001")}
                disabled
                className="h-8 text-sm"
                data-testid="input-voucher-number"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-voucher-date"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-muted-foreground">Purchase Orders ({selectedPOIds.length})</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-8 justify-start font-normal text-sm" 
                    data-testid="button-select-purchase-orders"
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
                            setSelectedPOIds(prev => 
                              prev.includes(po.id) 
                                ? prev.filter(id => id !== po.id)
                                : [...prev, po.id]
                            );
                          }}
                          data-testid={`checkbox-po-${po.id}`}
                        >
                          <Checkbox checked={selectedPOIds.includes(po.id)} />
                          <div className="flex-1 text-sm">
                            <div className="font-medium">{po.invoiceNumber || `PO #${po.id}`}</div>
                            <div className="text-xs text-muted-foreground">
                              {po.supplier?.name} - {po.lineItems?.reduce((sum, li) => sum + (li.quantity || 0), 0)} units
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 2: Four Cost Cards Side by Side */}
          <div className="grid gap-3 md:grid-cols-4">
            {/* HK→DXB Freight Card */}
            <div className="p-3 border rounded-md bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                <Truck className="h-3 w-3" /> HK → DXB
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Amount (KWD)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={hkToDxbAmount}
                    onChange={(e) => setHkToDxbAmount(e.target.value)}
                    className="h-7 text-xs"
                    data-testid="input-hk-dxb-amount"
                  />
                </div>
                <Select value={hkDxbPartyId?.toString() || ""} onValueChange={(v) => setHkDxbPartyId(v ? parseInt(v) : null)}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-hk-dxb-party">
                    <SelectValue placeholder="Logistics Co." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between text-xs font-medium">
                <span>Total:</span>
                <span className="font-mono text-blue-700 dark:text-blue-300">{formatCurrency(hkToDxbKwd)}</span>
              </div>
            </div>

            {/* DXB→KWI Freight Card */}
            <div className="p-3 border rounded-md bg-cyan-50/50 dark:bg-cyan-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                <Truck className="h-3 w-3" /> DXB → KWI
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Amount (KWD)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={dxbToKwiAmount}
                    onChange={(e) => setDxbToKwiAmount(e.target.value)}
                    className="h-7 text-xs"
                    data-testid="input-dxb-kwi-amount"
                  />
                </div>
                <Select value={dxbKwiPartyId?.toString() || ""} onValueChange={(v) => setDxbKwiPartyId(v ? parseInt(v) : null)}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-dxb-kwi-party">
                    <SelectValue placeholder="Logistics Co." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 border-t border-cyan-200 dark:border-cyan-800 flex justify-between text-xs font-medium">
                <span>Total:</span>
                <span className="font-mono text-cyan-700 dark:text-cyan-300">{formatCurrency(dxbToKwiKwd)}</span>
              </div>
            </div>

            {/* Partner Card */}
            <div className="p-3 border rounded-md bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                <Users className="h-3 w-3" /> Partner
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Profit (KWD)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={partnerProfitAmount}
                    onChange={(e) => setPartnerProfitAmount(e.target.value)}
                    className="h-7 text-xs"
                    data-testid="input-partner-profit"
                  />
                </div>
                <Select value={partnerPartyId?.toString() || ""} onValueChange={(v) => setPartnerPartyId(v ? parseInt(v) : null)}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-partner-party">
                    <SelectValue placeholder="Partner Co." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 border-t border-purple-200 dark:border-purple-800 flex justify-between text-xs font-medium">
                <span>Total:</span>
                <span className="font-mono text-purple-700 dark:text-purple-300">{formatCurrency(partnerProfitKwd)}</span>
              </div>
            </div>

            {/* Packing Card */}
            <div className="p-3 border rounded-md bg-green-50/50 dark:bg-green-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-300">
                <Package className="h-3 w-3" /> Packing
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Charges (KWD)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={packingAmount}
                    onChange={(e) => setPackingAmount(e.target.value)}
                    className="h-7 text-xs"
                    data-testid="input-packing-amount"
                  />
                </div>
                <Select value={packingPartyId?.toString() || ""} onValueChange={(v) => setPackingPartyId(v ? parseInt(v) : null)}>
                  <SelectTrigger className="h-7 text-xs" data-testid="select-packing-party">
                    <SelectValue placeholder="Packing Co." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 border-t border-green-200 dark:border-green-800 flex justify-between text-xs font-medium">
                <span>Total:</span>
                <span className="font-mono text-green-700 dark:text-green-300">{formatCurrency(packingChargesKwd)}</span>
              </div>
            </div>
          </div>

          {/* Row 3: Notes (optional, compact) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about this shipment..."
              className="h-8 text-sm"
              data-testid="input-notes"
            />
          </div>

          {/* Row 4: Grand Total Banner */}
          <div className="p-3 bg-muted rounded-md flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                <Truck className="h-3 w-3 inline mr-1" />{formatCurrency(totalFreightKwd)}
              </span>
              <span className="text-muted-foreground">+</span>
              <span className="text-muted-foreground">
                <Users className="h-3 w-3 inline mr-1" />{formatCurrency(partnerProfitKwd)}
              </span>
              <span className="text-muted-foreground">+</span>
              <span className="text-muted-foreground">
                <Package className="h-3 w-3 inline mr-1" />{formatCurrency(packingChargesKwd)}
              </span>
            </div>
            <div className="text-lg font-bold">
              = {formatCurrency(grandTotalKwd)} KWD
            </div>
          </div>

          {/* Row 5: Items Table */}
          {allocatedLineItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Items ({totalQuantity} units)</div>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-1.5 text-xs">Item</TableHead>
                      <TableHead className="py-1.5 text-xs text-right">Qty</TableHead>
                      <TableHead className="py-1.5 text-xs text-right">Unit</TableHead>
                      <TableHead className="py-1.5 text-xs text-right text-blue-600 dark:text-blue-400">Freight</TableHead>
                      <TableHead className="py-1.5 text-xs text-right text-purple-600 dark:text-purple-400">Partner</TableHead>
                      <TableHead className="py-1.5 text-xs text-right text-green-600 dark:text-green-400">Pack</TableHead>
                      <TableHead className="py-1.5 text-xs text-right font-semibold">Landed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocatedLineItems.map((li, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-1 text-xs">{li.itemName}</TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono">{li.quantity}</TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono">{li.unitPriceKwd}</TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono text-blue-600">{li.freightPerUnitKwd}</TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono text-purple-600">{li.partnerProfitPerUnitKwd}</TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono text-green-600">{li.packingPerUnitKwd}</TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono font-semibold">{li.landedCostPerUnitKwd}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {selectedPOIds.length === 0 && !isEditing && (
            <div className="p-4 bg-muted/50 rounded-md text-center text-sm text-muted-foreground">
              Select at least one Purchase Order above to calculate landed costs
            </div>
          )}
        </div>
      </CardContent>

      {/* Footer */}
      <div className="p-4 border-t flex-shrink-0 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending || (!isEditing && selectedPOIds.length === 0)} data-testid="button-save-voucher">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isEditing ? "Update" : "Create"}
        </Button>
      </div>
    </>
  );
}

interface PayLandedCostDialogProps {
  voucher: LandedCostVoucherWithDetails;
  onClose: () => void;
}

function PayLandedCostDialog({ voucher, onClose }: PayLandedCostDialogProps) {
  const { toast } = useToast();
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");

  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [accountId, setAccountId] = useState<number | null>(null);

  // Build list of payable targets (freight, partner, packing) that are still pending
  const paymentTargets = useMemo(() => {
    const targets: { type: "freight" | "partner" | "packing"; label: string; partyName: string; amount: string; color: string }[] = [];
    
    // Freight (logistics company)
    if (voucher.partyId && voucher.payableStatus === "pending" && parseFloat(voucher.totalFreightKwd || "0") > 0) {
      targets.push({
        type: "freight",
        label: "Freight",
        partyName: voucher.party?.name || "Logistics Company",
        amount: voucher.totalFreightKwd || "0",
        color: "text-blue-600"
      });
    }
    
    // Partner profit
    if (voucher.partnerPartyId && voucher.partnerPayableStatus === "pending" && parseFloat(voucher.totalPartnerProfitKwd || "0") > 0) {
      targets.push({
        type: "partner",
        label: "Partner",
        partyName: voucher.partnerParty?.name || "Partner Company",
        amount: voucher.totalPartnerProfitKwd || "0",
        color: "text-purple-600"
      });
    }
    
    // Packing charges
    if (voucher.packingPartyId && voucher.packingPayableStatus === "pending" && parseFloat(voucher.packingChargesKwd || "0") > 0) {
      targets.push({
        type: "packing",
        label: "Packing",
        partyName: voucher.packingParty?.name || "Packing Company",
        amount: voucher.packingChargesKwd || "0",
        color: "text-green-600"
      });
    }
    
    return targets;
  }, [voucher]);

  const [selectedTarget, setSelectedTarget] = useState<"freight" | "partner" | "packing">(
    paymentTargets[0]?.type || "freight"
  );

  const currentTarget = paymentTargets.find(t => t.type === selectedTarget) || paymentTargets[0];

  const payMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/landed-cost-vouchers/${voucher.id}/pay`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landed-cost-vouchers"] });
      const targetLabel = currentTarget?.label || "Payment";
      toast({ title: "Payment Recorded", description: `${targetLabel} payment has been recorded.` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to record payment.", variant: "destructive" });
    },
  });

  const handlePay = () => {
    payMutation.mutate({
      paymentDate,
      paymentType,
      paymentReference: paymentReference || null,
      accountId: accountId || null,
      paymentTarget: selectedTarget,
    });
  };

  if (paymentTargets.length === 0) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No Pending Payments</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-muted-foreground">
            All payments for this voucher have been completed.
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Payment Target Selection */}
          {paymentTargets.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Payment For</Label>
              <div className="grid grid-cols-3 gap-2">
                {paymentTargets.map(target => (
                  <Button
                    key={target.type}
                    variant={selectedTarget === target.type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTarget(target.type)}
                    className="text-xs"
                    data-testid={`button-target-${target.type}`}
                  >
                    {target.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="p-3 bg-muted rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pay To:</span>
              <span className={`font-medium ${currentTarget?.color}`}>{currentTarget?.partyName}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono font-semibold">{formatCurrency(currentTarget?.amount || "0")} KWD</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="outline" className={currentTarget?.color}>{currentTarget?.label}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8"
                data-testid="input-payment-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="h-8" data-testid="select-payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Account</Label>
            <Select value={accountId?.toString() || ""} onValueChange={(v) => setAccountId(v ? parseInt(v) : null)}>
              <SelectTrigger className="h-8" data-testid="select-account">
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reference</Label>
            <Input
              placeholder="Payment reference..."
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="h-8"
              data-testid="input-payment-reference"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePay} disabled={payMutation.isPending} data-testid="button-confirm-payment">
            {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MonthlySettlementsDialogProps {
  onClose: () => void;
}

interface PendingPartyDues {
  partyId: number;
  partyName: string;
  voucherCount: number;
  totalAmountKwd: number;
  vouchers: LandedCostVoucherWithDetails[];
}

interface PartySettlementRecord {
  id: number;
  settlementNumber: string;
  partyType: string;
  partyId: number;
  settlementPeriod: string;
  settlementDate: string;
  totalAmountKwd: string;
  voucherIds: string;
  status: string;
  party: Supplier | null;
}

function MonthlySettlementsDialog({ onClose }: MonthlySettlementsDialogProps) {
  const { toast } = useToast();
  const [partyType, setPartyType] = useState<"partner" | "packing">("partner");
  const [selectedParty, setSelectedParty] = useState<PendingPartyDues | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { data: pendingDues = [], isLoading: loadingDues, refetch: refetchPending } = useQuery<PendingPartyDues[]>({
    queryKey: ["/api/party-settlements/pending", partyType],
    queryFn: async () => {
      const res = await fetch(`/api/party-settlements/pending/${partyType}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pending dues");
      return res.json();
    },
  });

  const { data: settlements = [], isLoading: loadingSettlements, refetch: refetchSettlements } = useQuery<PartySettlementRecord[]>({
    queryKey: ["/api/party-settlements", partyType],
    queryFn: async () => {
      const res = await fetch(`/api/party-settlements?partyType=${partyType}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settlements");
      return res.json();
    },
  });

  const { data: accounts = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const settleMutation = useMutation({
    mutationFn: async (data: { partyId: number; voucherIds: number[]; totalAmount: number; period: string }) => {
      // First get the next settlement number from the backend
      const numberRes = await fetch("/api/party-settlements/next-number", { credentials: "include" });
      if (!numberRes.ok) throw new Error("Failed to get settlement number");
      const { number: settlementNumber } = await numberRes.json();
      
      const createRes = await apiRequest("POST", "/api/party-settlements", {
        settlementNumber,
        partyType,
        partyId: data.partyId,
        settlementPeriod: data.period,
        settlementDate: new Date().toISOString().split("T")[0],
        totalAmountKwd: data.totalAmount.toFixed(3),
        voucherIds: JSON.stringify(data.voucherIds),
        accountId,
        status: "pending",
      });
      
      const settlement = await createRes.json();
      
      const finalizeRes = await apiRequest("POST", `/api/party-settlements/${settlement.id}/finalize`, {
        accountId,
        notes,
      });
      
      return finalizeRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/party-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/landed-cost-vouchers"] });
      refetchPending();
      refetchSettlements();
      toast({ title: "Settlement Complete", description: "Monthly settlement has been processed and vouchers marked as paid." });
      setSelectedParty(null);
      setAccountId(null);
      setNotes("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to process settlement.", variant: "destructive" });
    },
  });

  const handleSettle = () => {
    if (!selectedParty || !accountId) {
      toast({ title: "Missing Information", description: "Please select a party and payment account.", variant: "destructive" });
      return;
    }

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    settleMutation.mutate({
      partyId: selectedParty.partyId,
      voucherIds: selectedParty.vouchers.map(v => v.id),
      totalAmount: selectedParty.totalAmountKwd,
      period,
    });
  };

  const partyTypeLabel = partyType === "partner" ? "Partner" : "Packing Co.";
  const amountLabel = partyType === "partner" ? "Partner Profit" : "Packing Charges";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Party Settlements
          </DialogTitle>
          <DialogDescription>
            Settle pending dues for Partner and Packing Co. parties
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant={partyType === "partner" ? "default" : "outline"}
            size="sm"
            onClick={() => { setPartyType("partner"); setSelectedParty(null); }}
            data-testid="button-type-partner"
          >
            <Users className="h-4 w-4 mr-2" />
            Partner
          </Button>
          <Button
            variant={partyType === "packing" ? "default" : "outline"}
            size="sm"
            onClick={() => { setPartyType("packing"); setSelectedParty(null); }}
            data-testid="button-type-packing"
          >
            <Package className="h-4 w-4 mr-2" />
            Packing Co.
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Pending {partyTypeLabel} Dues</h3>
              {loadingDues ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : pendingDues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border rounded-md">
                  No pending dues for {partyTypeLabel}
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingDues.map(party => (
                    <Card
                      key={party.partyId}
                      className={`cursor-pointer hover-elevate ${selectedParty?.partyId === party.partyId ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setSelectedParty(party)}
                      data-testid={`card-party-${party.partyId}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{party.partyName}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {party.voucherCount} voucher(s) pending
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-semibold text-lg">
                              {party.totalAmountKwd.toFixed(3)} KWD
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {amountLabel}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {selectedParty && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Settle {selectedParty.partyName}</CardTitle>
                  <CardDescription>
                    Pay all {selectedParty.voucherCount} pending vouchers as a single monthly settlement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Due:</span>
                      <span className="font-mono font-bold">{selectedParty.totalAmountKwd.toFixed(3)} KWD</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Vouchers:</span>
                      <span>{selectedParty.voucherCount}</span>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="py-2">Voucher</TableHead>
                          <TableHead className="py-2">Date</TableHead>
                          <TableHead className="py-2 text-right">{amountLabel}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedParty.vouchers.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="py-1.5 font-medium">{v.voucherNumber}</TableCell>
                            <TableCell className="py-1.5">{format(new Date(v.voucherDate), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono">
                              {partyType === "partner" 
                                ? formatCurrency(v.totalPartnerProfitKwd || "0")
                                : formatCurrency(v.packingChargesKwd || "0")
                              } KWD
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment Account</Label>
                    <Select value={accountId?.toString() || ""} onValueChange={(v) => setAccountId(v ? parseInt(v) : null)}>
                      <SelectTrigger data-testid="select-settlement-account">
                        <SelectValue placeholder="Select account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes (Optional)</Label>
                    <Textarea
                      placeholder="Settlement notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none"
                      rows={2}
                      data-testid="input-settlement-notes"
                    />
                  </div>

                  <div className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                    This will create an outgoing payment and expense record, then mark all {selectedParty.voucherCount} vouchers as paid.
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleSettle}
                    disabled={settleMutation.isPending || !accountId}
                    data-testid="button-finalize-settlement"
                  >
                    {settleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
                    Pay {selectedParty.totalAmountKwd.toFixed(3)} KWD
                  </Button>
                </CardContent>
              </Card>
            )}

            {settlements.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Past Settlements</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2">Settlement #</TableHead>
                      <TableHead className="py-2">Party</TableHead>
                      <TableHead className="py-2">Period</TableHead>
                      <TableHead className="py-2 text-right">Amount</TableHead>
                      <TableHead className="py-2">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.slice(0, 10).map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="py-2 font-medium">{s.settlementNumber}</TableCell>
                        <TableCell className="py-2">{s.party?.name || "Unknown"}</TableCell>
                        <TableCell className="py-2">{s.settlementPeriod}</TableCell>
                        <TableCell className="py-2 text-right font-mono">{formatCurrency(s.totalAmountKwd)} KWD</TableCell>
                        <TableCell className="py-2">
                          <Badge variant={s.status === "paid" ? "default" : "secondary"}>
                            {s.status === "paid" ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
