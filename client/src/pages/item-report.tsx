import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, Package } from "lucide-react";
import type { Item } from "@shared/schema";

interface Customer {
  id: number;
  name: string;
}

interface ItemSaleRecord {
  date: string;
  invoiceNumber: string;
  customerName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export default function ItemReport() {
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: salesData = [], isLoading } = useQuery<ItemSaleRecord[]>({
    queryKey: ["/api/reports/item-sales", { itemId: selectedItemId, customerId: selectedCustomerId, startDate, endDate }],
    enabled: !!selectedItemId,
  });

  const selectedItem = items.find(i => i.id.toString() === selectedItemId);
  const selectedCustomer = customers.find(c => c.id.toString() === selectedCustomerId);

  const totalQuantity = salesData.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = salesData.reduce((sum, r) => sum + r.totalAmount, 0);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Item Sales Report - ${selectedItem?.name || ""}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          .filters { margin-bottom: 20px; padding: 10px; border: 1px solid #000; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { font-weight: bold; }
          .text-right { text-align: right; }
          .totals { font-weight: bold; border-top: 2px solid #000; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Item Sales Report</h1>
        <p class="subtitle">${selectedItem?.name || ""}</p>
        <div class="filters">
          ${selectedCustomer ? `<strong>Customer:</strong> ${selectedCustomer.name}` : "All Customers"}
          ${startDate ? ` | <strong>From:</strong> ${startDate}` : ""}
          ${endDate ? ` <strong>To:</strong> ${endDate}` : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice #</th>
              <th>Customer</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${salesData.map(r => `
              <tr>
                <td>${r.date}</td>
                <td>${r.invoiceNumber}</td>
                <td>${r.customerName}</td>
                <td class="text-right">${r.quantity}</td>
                <td class="text-right">${r.unitPrice.toFixed(3)} KWD</td>
                <td class="text-right">${r.totalAmount.toFixed(3)} KWD</td>
              </tr>
            `).join("")}
            <tr class="totals">
              <td colspan="3">Totals</td>
              <td class="text-right">${totalQuantity}</td>
              <td></td>
              <td class="text-right">${totalAmount.toFixed(3)} KWD</td>
            </tr>
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Item Sales Report</h1>
        </div>
        <Button
          onClick={handlePrint}
          disabled={!selectedItemId || salesData.length === 0}
          data-testid="button-print-item-report"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Select Item & Filters</CardTitle>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCustomerId("");
              setStartDate("");
              setEndDate("");
            }}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger data-testid="select-item">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger data-testid="select-customer">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedItemId && (
        <Card>
          <CardHeader>
            <CardTitle>
              Sales History - {selectedItem?.name}
              {selectedCustomer ? ` (${selectedCustomer.name})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading sales data...</div>
            ) : salesData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No sales found for this item</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price (KWD)</TableHead>
                      <TableHead className="text-right">Total (KWD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((record, index) => (
                      <TableRow key={index} data-testid={`row-sale-${index}`}>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.invoiceNumber}</TableCell>
                        <TableCell>{record.customerName}</TableCell>
                        <TableCell className="text-right">{record.quantity}</TableCell>
                        <TableCell className="text-right">{record.unitPrice.toFixed(3)}</TableCell>
                        <TableCell className="text-right">{record.totalAmount.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={3}>Totals</TableCell>
                      <TableCell className="text-right">{totalQuantity}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{totalAmount.toFixed(3)} KWD</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
