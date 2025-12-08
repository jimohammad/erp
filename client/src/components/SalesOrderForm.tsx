import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw, Save, Loader2 } from "lucide-react";
import { LineItemRow, type LineItemData } from "./LineItemRow";
import { CurrencyToggle } from "./CurrencyToggle";
import { FileUploadField } from "./FileUploadField";
import type { Customer, Item } from "@shared/schema";

interface SalesOrderFormProps {
  customers: Customer[];
  items: Item[];
  onAddCustomer: () => void;
  onEditCustomers: () => void;
  onAddItem: () => void;
  onEditItems: () => void;
  onSubmit: (data: SalesFormData) => Promise<void>;
  isSubmitting: boolean;
  isAdmin?: boolean;
}

export interface SalesFormData {
  saleDate: string;
  invoiceNumber: string;
  customerId: number | null;
  fxCurrency: "AED" | "USD";
  fxRate: string;
  totalKwd: string;
  totalFx: string;
  deliveryDate: string;
  invoiceFile: File | null;
  deliveryNoteFile: File | null;
  paymentReceiptFile: File | null;
  lineItems: LineItemData[];
}

function generateItemId() {
  return Math.random().toString(36).substring(2, 9);
}

export function SalesOrderForm({
  customers,
  items,
  onAddCustomer,
  onEditCustomers,
  onAddItem,
  onEditItems,
  onSubmit,
  isSubmitting,
  isAdmin = false,
}: SalesOrderFormProps) {
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [fxCurrency, setFxCurrency] = useState<"AED" | "USD">("AED");
  const [fxRate, setFxRate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [deliveryNoteFile, setDeliveryNoteFile] = useState<File | null>(null);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", fxPrice: "", totalKwd: "0.000" },
  ]);

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
    setSaleDate(new Date().toISOString().split("T")[0]);
    setInvoiceNumber("");
    setCustomerId("");
    setFxCurrency("AED");
    setFxRate("");
    setDeliveryDate("");
    setInvoiceFile(null);
    setDeliveryNoteFile(null);
    setPaymentReceiptFile(null);
    setLineItems([
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", fxPrice: "", totalKwd: "0.000" },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      saleDate,
      invoiceNumber,
      customerId: customerId ? parseInt(customerId) : null,
      fxCurrency,
      fxRate,
      totalKwd: totals.totalKwd,
      totalFx: totals.totalFx,
      deliveryDate,
      invoiceFile,
      deliveryNoteFile,
      paymentReceiptFile,
      lineItems,
    });

    handleReset();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">New Sales Invoice</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            data-testid="button-reset-sales"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saleDate">Sale Date *</Label>
              <Input
                id="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                data-testid="input-sale-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                placeholder="e.g., INV-2024-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                data-testid="input-sales-invoice-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <div className="flex gap-2">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="flex-1" data-testid="select-customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      onClick={onAddCustomer}
                      title="Add new customer"
                      data-testid="button-add-customer"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={onEditCustomers}
                      data-testid="button-manage-customers"
                    >
                      Manage
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <CurrencyToggle value={fxCurrency} onChange={setFxCurrency} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fxRate">FX Rate (1 KWD = ?)</Label>
              <Input
                id="fxRate"
                type="number"
                step="0.0001"
                placeholder="e.g., 12.05"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                data-testid="input-sales-fx-rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                data-testid="input-delivery-date"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    onClick={onAddItem}
                    data-testid="button-add-sales-item"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    onClick={onEditItems}
                    data-testid="button-manage-sales-items"
                  >
                    Manage Items
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {lineItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  items={items}
                  fxCurrency={fxCurrency}
                  onUpdate={(field, value) => handleLineItemChange(item.id, field, value)}
                  onRemove={() => handleRemoveRow(item.id)}
                  canRemove={lineItems.length > 1}
                />
              ))}
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleAddRow}
              data-testid="button-add-sales-row"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Total (KWD)</Label>
              <p className="text-xl font-semibold font-mono" data-testid="text-sales-total-kwd">
                {totals.totalKwd} KWD
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Total ({fxCurrency})</Label>
              <p className="text-xl font-semibold font-mono" data-testid="text-sales-total-fx">
                {totals.totalFx || "—"} {fxCurrency}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FileUploadField
              label="Invoice"
              file={invoiceFile}
              onFileChange={setInvoiceFile}
              testId="input-sales-invoice-file"
            />
            <FileUploadField
              label="Delivery Note"
              file={deliveryNoteFile}
              onFileChange={setDeliveryNoteFile}
              testId="input-sales-delivery-file"
            />
            <FileUploadField
              label="Payment Receipt"
              file={paymentReceiptFile}
              onFileChange={setPaymentReceiptFile}
              testId="input-payment-receipt-file"
            />
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="button-submit-sales"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
