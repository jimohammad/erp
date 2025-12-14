import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw, Save, Loader2, Trash2, FileText } from "lucide-react";
import { CurrencyToggle } from "./CurrencyToggle";
import type { Supplier, Item } from "@shared/schema";

interface PODraftLineItem {
  id: number;
  itemName: string;
  quantity: number;
  priceKwd: string | null;
  fxPrice: string | null;
  totalKwd: string | null;
}

interface PurchaseOrderDraft {
  id: number;
  poNumber: string;
  poDate: string;
  status: string;
  supplierId: number | null;
  supplier: { id: number; name: string } | null;
  totalKwd: string;
  fxCurrency: string | null;
  fxRate: string | null;
  totalFx: string | null;
  notes: string | null;
  lineItems: PODraftLineItem[];
}

interface LineItemData {
  id: string;
  itemName: string;
  quantity: number;
  priceKwd: string;
  fxPrice: string;
  totalKwd: string;
}

interface PODraftFormProps {
  editingPO: PurchaseOrderDraft | null;
  onEditComplete: () => void;
}

function generateItemId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function PODraftForm({ editingPO, onEditComplete }: PODraftFormProps) {
  const { toast } = useToast();
  const { currentBranch } = useBranch();
  const supplierSelectRef = useRef<HTMLButtonElement>(null);
  
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [fxCurrency, setFxCurrency] = useState<"AED" | "USD">("AED");
  const [fxRate, setFxRate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", fxPrice: "", totalKwd: "0.000" },
  ]);
  const [totals, setTotals] = useState({ totalKwd: "0.000", totalFx: "" });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: nextNumberData, refetch: refetchNextNumber } = useQuery<{ poNumber: string }>({
    queryKey: ["/api/purchase-order-drafts/next-number"],
    enabled: !editingPO,
  });

  const resetForm = () => {
    setPoDate(new Date().toISOString().split("T")[0]);
    setSupplierId("");
    setFxCurrency("AED");
    setFxRate("");
    setNotes("");
    setLineItems([
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", fxPrice: "", totalKwd: "0.000" },
    ]);
    setTotals({ totalKwd: "0.000", totalFx: "" });
    refetchNextNumber();
    setTimeout(() => supplierSelectRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (!editingPO) {
      setTimeout(() => supplierSelectRef.current?.focus(), 100);
    }
  }, []);

  useEffect(() => {
    if (editingPO) {
      setPoNumber(editingPO.poNumber);
      setPoDate(editingPO.poDate.split("T")[0]);
      setSupplierId(editingPO.supplierId?.toString() || "");
      setFxCurrency((editingPO.fxCurrency as "AED" | "USD") || "AED");
      setFxRate(editingPO.fxRate || "");
      setNotes(editingPO.notes || "");
      setLineItems(
        editingPO.lineItems.map((item) => ({
          id: generateItemId(),
          itemName: item.itemName,
          quantity: item.quantity,
          priceKwd: item.priceKwd || "",
          fxPrice: item.fxPrice || "",
          totalKwd: item.totalKwd || "0.000",
        }))
      );
    } else if (nextNumberData?.poNumber) {
      setPoNumber(nextNumberData.poNumber);
    }
  }, [editingPO, nextNumberData]);

  useEffect(() => {
    let totalKwd = 0;
    const rate = parseFloat(fxRate) || 0;

    lineItems.forEach((item) => {
      const qty = item.quantity || 0;
      const price = parseFloat(item.priceKwd) || 0;
      totalKwd += qty * price;
    });

    setTotals({
      totalKwd: totalKwd.toFixed(3),
      totalFx: rate ? (totalKwd * rate).toFixed(2) : "",
    });
  }, [lineItems, fxRate]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/purchase-order-drafts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-order-drafts"] });
      toast({ title: "Purchase order created successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/purchase-order-drafts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-order-drafts"] });
      toast({ title: "Purchase order updated successfully" });
      onEditComplete();
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const handleLineItemChange = (id: string, field: keyof LineItemData, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        if (field === "quantity" || field === "priceKwd") {
          const qty = field === "quantity" ? (value as number) : item.quantity;
          const price = field === "priceKwd" ? parseFloat(value as string) || 0 : parseFloat(item.priceKwd) || 0;
          updated.totalKwd = (qty * price).toFixed(3);
        }

        return updated;
      })
    );
  };

  const handleAddRow = () => {
    setLineItems((prev) => [
      ...prev,
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", fxPrice: "", totalKwd: "0.000" },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      poNumber,
      poDate,
      supplierId: supplierId ? parseInt(supplierId) : null,
      branchId: currentBranch?.id || null,
      totalKwd: totals.totalKwd,
      fxCurrency,
      fxRate: fxRate || null,
      totalFx: totals.totalFx || null,
      notes: notes || null,
      status: editingPO?.status || "draft",
      lineItems: lineItems
        .filter((item) => item.itemName)
        .map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          priceKwd: item.priceKwd || null,
          fxPrice: item.fxPrice || null,
          totalKwd: item.totalKwd,
        })),
    };

    if (editingPO) {
      updateMutation.mutate({ id: editingPO.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleReset = () => {
    if (editingPO) {
      onEditComplete();
    }
    resetForm();
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5" />
          {editingPO ? "Edit Purchase Order" : "New Purchase Order"}
        </CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={handleReset} data-testid="button-reset-form">
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po-number">PO Number</Label>
              <Input
                id="po-number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="PO-00001"
                disabled
                data-testid="input-po-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="po-date">PO Date</Label>
              <Input
                id="po-date"
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                data-testid="input-po-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={supplierId || "none"} onValueChange={(val) => setSupplierId(val === "none" ? "" : val)}>
                <SelectTrigger ref={supplierSelectRef} data-testid="select-supplier">
                  <SelectValue placeholder="-- Select supplier --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Select supplier --</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Foreign Currency</Label>
              <CurrencyToggle value={fxCurrency} onChange={setFxCurrency} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fx-rate">FX Rate (KWD per {fxCurrency})</Label>
              <Input
                id="fx-rate"
                type="number"
                step="0.0001"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                placeholder="Enter exchange rate"
                data-testid="input-fx-rate"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRow} data-testid="button-add-row">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium text-sm">Item Name</th>
                    <th className="text-right p-2 font-medium text-sm w-24">Qty</th>
                    <th className="text-right p-2 font-medium text-sm w-32">Price KWD</th>
                    <th className="text-right p-2 font-medium text-sm w-32">Total KWD</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">
                        <Select
                          value={item.itemName}
                          onValueChange={(value) => handleLineItemChange(item.id, "itemName", value)}
                        >
                          <SelectTrigger data-testid={`select-item-${index}`}>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.name}>
                                {i.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, "quantity", parseInt(e.target.value) || 1)}
                          className="text-right"
                          data-testid={`input-qty-${index}`}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={item.priceKwd}
                          onChange={(e) => handleLineItemChange(item.id, "priceKwd", e.target.value)}
                          className="text-right"
                          placeholder="0.000"
                          data-testid={`input-price-${index}`}
                        />
                      </td>
                      <td className="p-2 text-right font-medium">{item.totalKwd}</td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRow(item.id)}
                          disabled={lineItems.length === 1}
                          data-testid={`button-remove-row-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t">
                    <td colSpan={3} className="p-2 text-right font-medium">
                      Total KWD:
                    </td>
                    <td className="p-2 text-right font-bold" data-testid="text-total-kwd">
                      {totals.totalKwd}
                    </td>
                    <td></td>
                  </tr>
                  {totals.totalFx && (
                    <tr>
                      <td colSpan={3} className="p-2 text-right font-medium">
                        Total {fxCurrency}:
                      </td>
                      <td className="p-2 text-right font-bold" data-testid="text-total-fx">
                        {totals.totalFx}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes about this purchase order..."
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <div className="flex items-center justify-end">
            <Button type="submit" disabled={isSubmitting} data-testid="button-save-po">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingPO ? "Update PO" : "Save PO"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
