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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, RotateCcw, Save, Loader2, Trash2, FileText, Barcode, Upload, X, FileSpreadsheet, ClipboardPaste } from "lucide-react";
import { CurrencyToggle } from "./CurrencyToggle";
import { FileUploadField } from "./FileUploadField";
import * as XLSX from "xlsx";
import type { Supplier, Item } from "@shared/schema";

interface PODraftLineItem {
  id: number;
  itemName: string;
  quantity: number;
  priceKwd: string | null;
  fxPrice: string | null;
  totalKwd: string | null;
  imeiNumbers: string[] | null;
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
  invoiceFilePath: string | null;
  deliveryNoteFilePath: string | null;
  ttCopyFilePath: string | null;
  lineItems: PODraftLineItem[];
}

interface LineItemData {
  id: string;
  itemName: string;
  quantity: number | "";
  priceKwd: string;
  fxPrice: string;
  totalKwd: string;
  imeiNumbers: string[];
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
  
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [fxCurrency, setFxCurrency] = useState<"AED" | "USD">("AED");
  const [fxRate, setFxRate] = useState("");
  const [fxTransferred, setFxTransferred] = useState("");
  const [kwdTransferred, setKwdTransferred] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { id: generateItemId(), itemName: "", quantity: "", priceKwd: "", fxPrice: "", totalKwd: "0.000", imeiNumbers: [] },
  ]);
  const [imeiDialogOpen, setImeiDialogOpen] = useState(false);
  const [activeLineItemId, setActiveLineItemId] = useState<string | null>(null);
  const [newImei, setNewImei] = useState("");
  const [imeiError, setImeiError] = useState("");
  const [bulkImeiText, setBulkImeiText] = useState("");
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [totals, setTotals] = useState({ totalKwd: "0.000", totalFx: "" });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [deliveryNoteFile, setDeliveryNoteFile] = useState<File | null>(null);
  const [ttCopyFile, setTtCopyFile] = useState<File | null>(null);

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
    setFxTransferred("");
    setKwdTransferred("");
    setNotes("");
    setLineItems([
      { id: generateItemId(), itemName: "", quantity: "", priceKwd: "", fxPrice: "", totalKwd: "0.000", imeiNumbers: [] },
    ]);
    setTotals({ totalKwd: "0.000", totalFx: "" });
    setInvoiceFile(null);
    setDeliveryNoteFile(null);
    setTtCopyFile(null);
    setImeiDialogOpen(false);
    setActiveLineItemId(null);
    setNewImei("");
    setImeiError("");
    setBulkImeiText("");
    refetchNextNumber();
  };

  useEffect(() => {
    if (editingPO) {
      setPoNumber(editingPO.poNumber);
      setPoDate(editingPO.poDate.split("T")[0]);
      setSupplierId(editingPO.supplierId?.toString() || "");
      setFxCurrency((editingPO.fxCurrency as "AED" | "USD") || "AED");
      setFxRate(editingPO.fxRate || "");
      setFxTransferred((editingPO as any).fxTransferred || "");
      setKwdTransferred((editingPO as any).kwdTransferred || "");
      setNotes(editingPO.notes || "");
      setLineItems(
        editingPO.lineItems.map((item) => ({
          id: generateItemId(),
          itemName: item.itemName,
          quantity: item.quantity,
          priceKwd: item.priceKwd || "",
          fxPrice: item.fxPrice || "",
          totalKwd: item.totalKwd || "0.000",
          imeiNumbers: item.imeiNumbers || [],
        }))
      );
    } else if (nextNumberData?.poNumber) {
      setPoNumber(nextNumberData.poNumber);
    }
  }, [editingPO, nextNumberData]);

  // Auto-calculate FX rate when both fxTransferred and kwdTransferred are entered
  useEffect(() => {
    const fxAmount = parseFloat(fxTransferred) || 0;
    const kwdAmount = parseFloat(kwdTransferred) || 0;
    
    if (fxAmount > 0 && kwdAmount > 0) {
      const calculatedRate = kwdAmount / fxAmount;
      setFxRate(calculatedRate.toFixed(4));
    }
  }, [fxTransferred, kwdTransferred]);

  useEffect(() => {
    let totalFxFromItems = 0;
    let totalKwdFromItems = 0;
    const rate = parseFloat(fxRate) || 0;
    const fxTrans = parseFloat(fxTransferred) || 0;
    const kwdTrans = parseFloat(kwdTransferred) || 0;

    lineItems.forEach((item) => {
      const qty = item.quantity || 0;
      const fxPrice = parseFloat(item.fxPrice) || 0;
      const kwdPrice = parseFloat(item.priceKwd) || 0;
      totalFxFromItems += qty * fxPrice;
      totalKwdFromItems += qty * kwdPrice;
    });

    // Use kwdTransferred if available, then try fxTransferred * rate, otherwise sum from items
    const calculatedKwd = kwdTrans || (fxTrans && rate ? (fxTrans * rate) : totalKwdFromItems);

    setTotals({
      totalKwd: calculatedKwd.toFixed(3),
      totalFx: totalFxFromItems ? totalFxFromItems.toFixed(2) : "",
    });
  }, [lineItems, fxRate, fxTransferred, kwdTransferred]);

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
        const rate = parseFloat(fxRate) || 0;

        // When FX price changes, auto-calculate KWD price if rate is set
        if (field === "fxPrice" && rate > 0) {
          const fxPriceVal = parseFloat(value as string) || 0;
          updated.priceKwd = (fxPriceVal / rate).toFixed(3);
        }

        // Recalculate total KWD based on quantity and priceKwd
        if (field === "quantity" || field === "priceKwd" || field === "fxPrice") {
          const qtyVal = field === "quantity" ? value : item.quantity;
          const qty = typeof qtyVal === "number" ? qtyVal : (parseInt(qtyVal as string) || 0);
          const price = field === "priceKwd" 
            ? (parseFloat(value as string) || 0)
            : (field === "fxPrice" && rate > 0)
              ? (parseFloat(value as string) || 0) / rate
              : parseFloat(item.priceKwd) || 0;
          updated.totalKwd = (qty * price).toFixed(3);
        }

        return updated;
      })
    );
  };

  const handleAddRow = () => {
    setLineItems((prev) => [
      ...prev,
      { id: generateItemId(), itemName: "", quantity: "", priceKwd: "", fxPrice: "", totalKwd: "0.000", imeiNumbers: [] },
    ]);
  };

  // Get all IMEI numbers from all line items for duplicate checking
  const getAllImeis = (): string[] => {
    return lineItems.flatMap((item) => item.imeiNumbers);
  };

  const validateImei = (imei: string): string | null => {
    const trimmedImei = imei.trim();
    if (!/^\d+$/.test(trimmedImei)) {
      return "IMEI must contain only digits";
    }
    if (trimmedImei.length !== 15) {
      return "IMEI must be exactly 15 digits";
    }
    if (getAllImeis().includes(trimmedImei)) {
      return "This IMEI has already been added";
    }
    return null;
  };

  const openImeiDialog = (lineItemId: string) => {
    setActiveLineItemId(lineItemId);
    setNewImei("");
    setImeiError("");
    setBulkImeiText("");
    setImeiDialogOpen(true);
  };

  const handleAddSingleImei = () => {
    if (!activeLineItemId || !newImei.trim()) return;
    
    const error = validateImei(newImei);
    if (error) {
      setImeiError(error);
      return;
    }

    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== activeLineItemId) return item;
        const updatedImeis = [...item.imeiNumbers, newImei.trim()];
        return { ...item, imeiNumbers: updatedImeis, quantity: updatedImeis.length };
      })
    );
    setNewImei("");
    setImeiError("");
  };

  const handleRemoveImei = (imeiIndex: number) => {
    if (!activeLineItemId) return;
    
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== activeLineItemId) return item;
        const updatedImeis = item.imeiNumbers.filter((_, i) => i !== imeiIndex);
        return { ...item, imeiNumbers: updatedImeis, quantity: Math.max(1, updatedImeis.length) };
      })
    );
  };

  const handleBulkImeiImport = () => {
    if (!activeLineItemId || !bulkImeiText.trim()) return;

    // Parse IMEIs from text (newlines, commas, tabs, spaces)
    const rawImeis = bulkImeiText.split(/[\n,\t\s]+/).map((s) => s.trim()).filter(Boolean);
    const validImeis: string[] = [];
    const errors: string[] = [];

    rawImeis.forEach((imei) => {
      const error = validateImei(imei);
      if (error) {
        errors.push(`${imei}: ${error}`);
      } else if (!validImeis.includes(imei)) {
        validImeis.push(imei);
      }
    });

    if (validImeis.length > 0) {
      setLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== activeLineItemId) return item;
          const updatedImeis = [...item.imeiNumbers, ...validImeis];
          return { ...item, imeiNumbers: updatedImeis, quantity: updatedImeis.length };
        })
      );
      setBulkImeiText("");
      toast({ 
        title: `Imported ${validImeis.length} IMEI(s)`,
        description: errors.length > 0 ? `${errors.length} skipped (invalid or duplicate)` : undefined
      });
    } else if (errors.length > 0) {
      setImeiError("No valid IMEIs found");
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLineItemId) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

        // Extract all values that look like IMEIs (15-digit numbers)
        const imeis: string[] = [];
        jsonData.forEach((row) => {
          row.forEach((cell) => {
            const cellStr = String(cell).trim();
            if (/^\d{15}$/.test(cellStr)) {
              imeis.push(cellStr);
            }
          });
        });

        if (imeis.length > 0) {
          const validImeis: string[] = [];
          imeis.forEach((imei) => {
            if (!validateImei(imei) && !validImeis.includes(imei)) {
              validImeis.push(imei);
            }
          });

          if (validImeis.length > 0) {
            setLineItems((prev) =>
              prev.map((item) => {
                if (item.id !== activeLineItemId) return item;
                const updatedImeis = [...item.imeiNumbers, ...validImeis];
                return { ...item, imeiNumbers: updatedImeis, quantity: updatedImeis.length };
              })
            );
            toast({ title: `Imported ${validImeis.length} IMEI(s) from Excel` });
          } else {
            toast({ title: "No new valid IMEIs found", variant: "destructive" });
          }
        } else {
          toast({ title: "No IMEIs found in file", description: "IMEIs should be 15-digit numbers", variant: "destructive" });
        }
      } catch {
        toast({ title: "Failed to read Excel file", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const getActiveLineItem = () => lineItems.find((item) => item.id === activeLineItemId);

  const handleRemoveRow = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!file) return null;
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = response as { uploadURL: string };

      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const updateResponse = await apiRequest("PUT", "/api/files/uploaded", { uploadURL });
      return (updateResponse as { objectPath: string }).objectPath;
    } catch (error) {
      console.error("Upload failed:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let invoiceFilePath = editingPO?.invoiceFilePath || null;
    let deliveryNoteFilePath = editingPO?.deliveryNoteFilePath || null;
    let ttCopyFilePath = editingPO?.ttCopyFilePath || null;

    if (invoiceFile) {
      invoiceFilePath = await uploadFile(invoiceFile);
    }
    if (deliveryNoteFile) {
      deliveryNoteFilePath = await uploadFile(deliveryNoteFile);
    }
    if (ttCopyFile) {
      ttCopyFilePath = await uploadFile(ttCopyFile);
    }

    const payload = {
      poNumber,
      poDate,
      supplierId: supplierId ? parseInt(supplierId) : null,
      branchId: currentBranch?.id || null,
      totalKwd: totals.totalKwd,
      fxCurrency,
      fxRate: fxRate || null,
      totalFx: totals.totalFx || null,
      fxTransferred: fxTransferred || null,
      kwdTransferred: kwdTransferred || null,
      notes: notes || null,
      invoiceFilePath,
      deliveryNoteFilePath,
      ttCopyFilePath,
      status: editingPO?.status || "draft",
      lineItems: lineItems
        .filter((item) => item.itemName)
        .map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          priceKwd: item.priceKwd || null,
          fxPrice: item.fxPrice || null,
          totalKwd: item.totalKwd,
          imeiNumbers: item.imeiNumbers.length > 0 ? item.imeiNumbers : null,
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
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={supplierId || "none"} onValueChange={(val) => setSupplierId(val === "none" ? "" : val)}>
                <SelectTrigger data-testid="select-supplier">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Foreign Currency</Label>
              <CurrencyToggle value={fxCurrency} onChange={setFxCurrency} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fx-transferred">Total {fxCurrency} Transferred</Label>
              <Input
                id="fx-transferred"
                type="number"
                step="0.01"
                value={fxTransferred}
                onChange={(e) => setFxTransferred(e.target.value)}
                placeholder={`Enter ${fxCurrency} amount`}
                data-testid="input-fx-transferred"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kwd-transferred">Total KWD Transferred</Label>
              <Input
                id="kwd-transferred"
                type="number"
                step="0.001"
                value={kwdTransferred}
                onChange={(e) => setKwdTransferred(e.target.value)}
                placeholder="Enter KWD amount"
                data-testid="input-kwd-transferred"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fx-rate">FX Rate (Auto-calculated)</Label>
              <Input
                id="fx-rate"
                type="number"
                step="0.0001"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                placeholder="KWD per 1 {fxCurrency}"
                className={fxTransferred && kwdTransferred ? "bg-muted" : ""}
                readOnly={!!(fxTransferred && kwdTransferred)}
                data-testid="input-fx-rate"
              />
              {fxTransferred && kwdTransferred && (
                <p className="text-xs text-muted-foreground">
                  Rate: {fxRate} KWD/{fxCurrency}
                </p>
              )}
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
                    <th className="text-center p-2 font-medium text-sm w-20">IMEI</th>
                    <th className="text-right p-2 font-medium text-sm w-24">Qty</th>
                    <th className="text-right p-2 font-medium text-sm w-28">Price {fxCurrency}</th>
                    <th className="text-right p-2 font-medium text-sm w-28">Price KWD</th>
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
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant={item.imeiNumbers.length > 0 ? "default" : "outline"}
                          size="sm"
                          onClick={() => openImeiDialog(item.id)}
                          disabled={!item.itemName}
                          data-testid={`button-imei-${index}`}
                        >
                          <Barcode className="h-4 w-4 mr-1" />
                          {item.imeiNumbers.length > 0 ? item.imeiNumbers.length : "Add"}
                        </Button>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, "quantity", e.target.value === "" ? "" : (parseInt(e.target.value) || 0))}
                          className="text-right"
                          data-testid={`input-qty-${index}`}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.fxPrice}
                          onChange={(e) => handleLineItemChange(item.id, "fxPrice", e.target.value)}
                          className="text-right"
                          placeholder="0.00"
                          data-testid={`input-fx-price-${index}`}
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
                    <td colSpan={5} className="p-2 text-right font-medium">
                      Total KWD:
                    </td>
                    <td className="p-2 text-right font-bold" data-testid="text-total-kwd">
                      {totals.totalKwd}
                    </td>
                    <td></td>
                  </tr>
                  {totals.totalFx && (
                    <tr>
                      <td colSpan={5} className="p-2 text-right font-medium">
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

          <div className="space-y-4">
            <Label className="text-base font-medium">Supporting Documents</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FileUploadField
                label="Invoice"
                value={invoiceFile}
                onChange={setInvoiceFile}
                existingPath={editingPO?.invoiceFilePath}
                testId="invoice-upload"
              />
              <FileUploadField
                label="Delivery Note"
                value={deliveryNoteFile}
                onChange={setDeliveryNoteFile}
                existingPath={editingPO?.deliveryNoteFilePath}
                testId="delivery-note-upload"
              />
              <FileUploadField
                label="TT Copy"
                value={ttCopyFile}
                onChange={setTtCopyFile}
                existingPath={editingPO?.ttCopyFilePath}
                testId="tt-copy-upload"
              />
            </div>
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

      {/* IMEI Dialog */}
      <Dialog open={imeiDialogOpen} onOpenChange={setImeiDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Manage IMEIs - {getActiveLineItem()?.itemName || "Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Single IMEI Entry */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Single IMEI</Label>
              <div className="flex gap-2">
                <Input
                  value={newImei}
                  onChange={(e) => {
                    setNewImei(e.target.value);
                    setImeiError("");
                  }}
                  placeholder="Enter 15-digit IMEI"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSingleImei())}
                  data-testid="input-single-imei"
                />
                <Button type="button" onClick={handleAddSingleImei} data-testid="button-add-imei">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {imeiError && <p className="text-sm text-destructive">{imeiError}</p>}
            </div>

            {/* Bulk Import Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Bulk Import</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => excelInputRef.current?.click()}
                  data-testid="button-import-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Import Excel
                </Button>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelImport}
                  className="hidden"
                />
              </div>
              <Textarea
                value={bulkImeiText}
                onChange={(e) => setBulkImeiText(e.target.value)}
                placeholder="Paste IMEIs here (one per line, or comma/tab separated)"
                rows={3}
                data-testid="textarea-bulk-imei"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBulkImeiImport}
                disabled={!bulkImeiText.trim()}
                data-testid="button-import-bulk"
              >
                <ClipboardPaste className="h-4 w-4 mr-1" />
                Import Pasted IMEIs
              </Button>
            </div>

            {/* IMEI List */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Added IMEIs ({getActiveLineItem()?.imeiNumbers.length || 0})
              </Label>
              <ScrollArea className="h-40 border rounded-md p-2">
                {getActiveLineItem()?.imeiNumbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No IMEIs added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {getActiveLineItem()?.imeiNumbers.map((imei, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {imei}
                        <button
                          type="button"
                          onClick={() => handleRemoveImei(idx)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-remove-imei-${idx}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImeiDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
