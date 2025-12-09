import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw, Save, Loader2 } from "lucide-react";
import { LineItemRow, type LineItemData } from "./LineItemRow";
import { CurrencyToggle } from "./CurrencyToggle";
import { FileUploadField } from "./FileUploadField";
import type { Supplier, Item } from "@shared/schema";

interface PurchaseOrderFormProps {
  suppliers: Supplier[];
  items: Item[];
  onSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface FormData {
  purchaseDate: string;
  invoiceNumber: string;
  supplierId: number | null;
  fxCurrency: "AED" | "USD";
  fxRate: string;
  totalKwd: string;
  totalFx: string;
  grnDate: string;
  invoiceFile: File | null;
  deliveryNoteFile: File | null;
  ttCopyFile: File | null;
  lineItems: LineItemData[];
}

function generateItemId() {
  return Math.random().toString(36).substring(2, 9);
}

export function PurchaseOrderForm({
  suppliers,
  items,
  onSubmit,
  isSubmitting,
}: PurchaseOrderFormProps) {
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [fxCurrency, setFxCurrency] = useState<"AED" | "USD">("AED");
  const [fxRate, setFxRate] = useState("");
  const [grnDate, setGrnDate] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [deliveryNoteFile, setDeliveryNoteFile] = useState<File | null>(null);
  const [ttCopyFile, setTtCopyFile] = useState<File | null>(null);
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", fxPrice: "", totalKwd: "0.000" },
  ]);

  const calculateTotals = useCallback(() => {
    let totalKwd = 0;
    const rate = parseFloat(fxRate) || 0;

    const updatedItems = lineItems.map(item => {
      const qty = item.quantity || 0;
      const price = parseFloat(item.priceKwd) || 0;
      const itemTotal = qty * price;
      totalKwd += itemTotal;
      return {
        ...item,
        totalKwd: itemTotal.toFixed(3),
      };
    });

    setLineItems(updatedItems);
    
    return {
      totalKwd: totalKwd.toFixed(3),
      totalFx: rate ? (totalKwd * rate).toFixed(2) : "",
    };
  }, [lineItems, fxRate]);

  const [totals, setTotals] = useState({ totalKwd: "0.000", totalFx: "" });

  useEffect(() => {
    let totalKwd = 0;
    const rate = parseFloat(fxRate) || 0;

    lineItems.forEach(item => {
      const qty = item.quantity || 0;
      const price = parseFloat(item.priceKwd) || 0;
      totalKwd += qty * price;
    });

    setTotals({
      totalKwd: totalKwd.toFixed(3),
      totalFx: rate ? (totalKwd * rate).toFixed(2) : "",
    });
  }, [lineItems, fxRate]);

  const handleLineItemChange = (id: string, field: keyof LineItemData, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === "quantity" || field === "priceKwd") {
        const qty = field === "quantity" ? (value as number) : item.quantity;
        const price = field === "priceKwd" ? parseFloat(value as string) || 0 : parseFloat(item.priceKwd) || 0;
        updated.totalKwd = (qty * price).toFixed(3);
      }
      
      return updated;
    }));
  };

  const handleAddRow = () => {
    setLineItems(prev => [
      ...prev,
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", fxPrice: "", totalKwd: "0.000" },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setInvoiceNumber("");
    setSupplierId("");
    setFxCurrency("AED");
    setFxRate("");
    setGrnDate("");
    setInvoiceFile(null);
    setDeliveryNoteFile(null);
    setTtCopyFile(null);
    setLineItems([
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", fxPrice: "", totalKwd: "0.000" },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      purchaseDate,
      invoiceNumber,
      supplierId: supplierId ? parseInt(supplierId) : null,
      fxCurrency,
      fxRate,
      totalKwd: totals.totalKwd,
      totalFx: totals.totalFx,
      grnDate,
      invoiceFile,
      deliveryNoteFile,
      ttCopyFile,
      lineItems,
    });

    handleReset();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">New Purchase Entry</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          data-testid="button-reset-form"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset form
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Purchase Date</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                data-testid="input-purchase-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Invoice Number</Label>
              <Input
                type="text"
                placeholder="e.g. INV-2025-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                data-testid="input-invoice-number"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Supplier</Label>
            <div className="flex gap-2 flex-wrap">
              <Select value={supplierId || "none"} onValueChange={(val) => setSupplierId(val === "none" ? "" : val)}>
                <SelectTrigger className="flex-1 min-w-[180px]" data-testid="select-supplier">
                  <SelectValue placeholder="-- Select supplier --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Select supplier --</SelectItem>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id.toString()}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    <th className="px-3 py-2 text-left w-1/2 min-w-[400px]">Item</th>
                    <th className="px-1 py-2 text-center w-[8%]">Qty</th>
                    <th className="px-1 py-2 text-center w-[12%]">Price KWD</th>
                    <th className="px-1 py-2 text-center w-[15%]">FX Price</th>
                    <th className="px-1 py-2 text-center w-[15%]">Total</th>
                    <th className="px-3 py-2 text-center w-[10%]">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      items={items}
                      index={index}
                      onChange={handleLineItemChange}
                      onRemove={handleRemoveRow}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="text-xs"
              data-testid="button-add-row"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add item row
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Total Amount (KWD)</Label>
              <Input
                type="text"
                value={totals.totalKwd}
                readOnly
                className="bg-muted/50 font-mono"
                data-testid="input-total-kwd"
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Currency & Conversion Rate
                </Label>
                <div className="flex items-center gap-2">
                  <CurrencyToggle value={fxCurrency} onChange={setFxCurrency} />
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="Rate per 1 KWD"
                    value={fxRate}
                    onChange={(e) => setFxRate(e.target.value)}
                    className="flex-1"
                    data-testid="input-fx-rate"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Total Amount ({fxCurrency})
                </Label>
                <Input
                  type="text"
                  value={totals.totalFx || "Auto: Total KWD × Rate"}
                  readOnly
                  className="bg-muted/50 font-mono"
                  data-testid="input-total-fx"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FileUploadField
              label="Invoice"
              value={invoiceFile}
              onChange={setInvoiceFile}
              testId="file-invoice"
            />
            <FileUploadField
              label="Delivery Note"
              value={deliveryNoteFile}
              onChange={setDeliveryNoteFile}
              testId="file-delivery"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FileUploadField
              label="TT Copy"
              value={ttCopyFile}
              onChange={setTtCopyFile}
              testId="file-tt"
            />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Goods Arrived in Kuwait
              </Label>
              <Input
                type="date"
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
                data-testid="input-grn-date"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-[11px] text-muted-foreground">
              Note: Files are securely stored in cloud storage.
            </p>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary"
              data-testid="button-save-record"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Record
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
