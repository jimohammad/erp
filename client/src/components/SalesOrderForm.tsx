import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw, Save, Loader2 } from "lucide-react";
import { SalesLineItemRow, type SalesLineItemData } from "./SalesLineItemRow";
import type { Customer, Item } from "@shared/schema";

interface SalesOrderFormProps {
  customers: Customer[];
  items: Item[];
  onSubmit: (data: SalesFormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface SalesFormData {
  saleDate: string;
  invoiceNumber: string;
  customerId: number | null;
  totalKwd: string;
  lineItems: SalesLineItemData[];
}

function generateItemId() {
  return Math.random().toString(36).substring(2, 9);
}

export function SalesOrderForm({
  customers,
  items,
  onSubmit,
  isSubmitting,
}: SalesOrderFormProps) {
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [lineItems, setLineItems] = useState<SalesLineItemData[]>([
    { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
  ]);

  const [totalKwd, setTotalKwd] = useState("0.000");

  useEffect(() => {
    let total = 0;
    lineItems.forEach(item => {
      const qty = item.quantity || 0;
      const price = parseFloat(item.priceKwd) || 0;
      total += qty * price;
    });
    setTotalKwd(total.toFixed(3));
  }, [lineItems]);

  const handleLineItemChange = (id: string, field: keyof SalesLineItemData, value: string | number | string[]) => {
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
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    setSaleDate(new Date().toISOString().split("T")[0]);
    setInvoiceNumber("");
    setCustomerId("");
    setLineItems([
      { id: generateItemId(), itemName: "", quantity: 1, priceKwd: "", totalKwd: "0.000", imeiNumbers: [] },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      saleDate,
      invoiceNumber,
      customerId: customerId ? parseInt(customerId) : null,
      totalKwd,
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
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Line Items</Label>
            
            <div className="space-y-2">
              {lineItems.map((item, index) => {
                const allImeiNumbers = lineItems.flatMap(li => li.imeiNumbers);
                return (
                  <SalesLineItemRow
                    key={item.id}
                    item={item}
                    items={items}
                    index={index}
                    onChange={handleLineItemChange}
                    onRemove={handleRemoveRow}
                    canRemove={lineItems.length > 1}
                    allImeiNumbers={allImeiNumbers}
                  />
                );
              })}
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

          <div className="p-4 bg-muted/50 rounded-md">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Total (KWD)</Label>
              <p className="text-xl font-semibold font-mono" data-testid="text-sales-total-kwd">
                {totalKwd} KWD
              </p>
            </div>
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
