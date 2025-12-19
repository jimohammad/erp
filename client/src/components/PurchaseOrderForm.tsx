import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw, Save, Loader2, Share2, Printer } from "lucide-react";
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
  const supplierSelectRef = useRef<HTMLButtonElement>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");

  useEffect(() => {
    setTimeout(() => supplierSelectRef.current?.focus(), 100);
  }, []);
  const [fxCurrency, setFxCurrency] = useState<"AED" | "USD">("AED");
  const [fxRate, setFxRate] = useState("");
  const [grnDate, setGrnDate] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [deliveryNoteFile, setDeliveryNoteFile] = useState<File | null>(null);
  const [ttCopyFile, setTtCopyFile] = useState<File | null>(null);
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { id: generateItemId(), itemName: "", quantity: "", priceKwd: "", fxPrice: "", totalKwd: "0.000", imeiNumbers: [] },
  ]);

  const [totals, setTotals] = useState({ totalKwd: "0.000", totalFx: "" });

  useEffect(() => {
    let totalKwd = 0;
    const rate = parseFloat(fxRate) || 0;

    lineItems.forEach(item => {
      const qty = typeof item.quantity === "number" ? item.quantity : (parseInt(item.quantity) || 0);
      const price = parseFloat(item.priceKwd) || 0;
      totalKwd += qty * price;
    });

    setTotals({
      totalKwd: totalKwd.toFixed(3),
      totalFx: rate ? (totalKwd * rate).toFixed(2) : "",
    });
  }, [lineItems, fxRate]);

  const handleLineItemChange = (id: string, field: keyof LineItemData, value: string | number | string[]) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === "quantity" || field === "priceKwd") {
        const qtyVal = field === "quantity" ? value : item.quantity;
        const qty = typeof qtyVal === "number" ? qtyVal : (parseInt(qtyVal as string) || 0);
        const price = field === "priceKwd" ? parseFloat(value as string) || 0 : parseFloat(item.priceKwd) || 0;
        updated.totalKwd = (qty * price).toFixed(3);
      }
      
      return updated;
    }));
  };

  const handleAddRow = () => {
    setLineItems(prev => [
      ...prev,
      { id: generateItemId(), itemName: "", quantity: "", priceKwd: "", fxPrice: "", totalKwd: "0.000", imeiNumbers: [] },
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
      { id: generateItemId(), itemName: "", quantity: "", priceKwd: "", fxPrice: "", totalKwd: "0.000", imeiNumbers: [] },
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">Supplier</Label>
              <Select value={supplierId || "none"} onValueChange={(val) => setSupplierId(val === "none" ? "" : val)}>
                <SelectTrigger ref={supplierSelectRef} className="w-full" data-testid="select-supplier">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                data-testid="input-purchase-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Supplier Invoice Number</Label>
              <Input
                type="text"
                placeholder="e.g. INV-2025-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                data-testid="input-invoice-number"
              />
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
              Add Item
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

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <p className="text-[11px] text-muted-foreground">
              Note: Files are securely stored in cloud storage.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const supplierName = suppliers.find(s => s.id.toString() === supplierId)?.name || "Supplier";
                  const items = lineItems.filter(li => li.itemName).map(li => 
                    `${li.itemName} x${li.quantity} @ ${li.priceKwd} KWD = ${li.totalKwd} KWD`
                  ).join("\n");
                  const message = encodeURIComponent(
                    `Purchase Order\n` +
                    `Date: ${purchaseDate}\n` +
                    `Invoice: ${invoiceNumber || "N/A"}\n` +
                    `Supplier: ${supplierName}\n\n` +
                    `Items:\n${items}\n\n` +
                    `Total: ${totals.totalKwd} KWD` +
                    (totals.totalFx ? `\nFX Total: ${totals.totalFx} ${fxCurrency}` : "")
                  );
                  window.open(`https://wa.me/?text=${message}`, "_blank");
                }}
                data-testid="button-whatsapp-purchase"
              >
                <Share2 className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    const supplierName = suppliers.find(s => s.id.toString() === supplierId)?.name || "Supplier";
                    const itemRows = lineItems.filter(li => li.itemName).map(li => 
                      `<tr><td>${li.itemName}</td><td>${li.quantity}</td><td>${li.priceKwd}</td><td>${li.totalKwd}</td></tr>`
                    ).join("");
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Purchase Order</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          .header { text-align: center; margin-bottom: 20px; }
                          .company { font-size: 24px; font-weight: bold; }
                          .title { font-size: 18px; margin-top: 10px; }
                          .details { margin: 20px 0; }
                          .row { display: flex; justify-content: space-between; padding: 4px 0; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                          th { font-weight: bold; }
                          .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div class="company">Iqbal Electronics Co. WLL</div>
                          <div class="title">Purchase Order</div>
                        </div>
                        <div class="details">
                          <div class="row"><span>Date:</span><span>${purchaseDate}</span></div>
                          <div class="row"><span>Invoice:</span><span>${invoiceNumber || "N/A"}</span></div>
                          <div class="row"><span>Supplier:</span><span>${supplierName}</span></div>
                        </div>
                        <table>
                          <thead><tr><th>Item</th><th>Qty</th><th>Price (KWD)</th><th>Total (KWD)</th></tr></thead>
                          <tbody>${itemRows}</tbody>
                        </table>
                        <div class="total">Total: ${totals.totalKwd} KWD</div>
                        ${totals.totalFx ? `<div class="total">FX Total: ${totals.totalFx} ${fxCurrency}</div>` : ""}
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                data-testid="button-print-purchase"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
