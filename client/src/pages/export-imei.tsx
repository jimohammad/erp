import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Download, Search, Printer, FileText } from "lucide-react";
import type { Customer, Item } from "@shared/schema";

interface ImeiRecord {
  imei: string;
  itemName: string;
  customerName: string;
  invoiceNumber: string;
  saleDate: string;
}

export default function ExportImeiPage() {
  const [customerId, setCustomerId] = useState<string>("");
  const [itemName, setItemName] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    if (customerId && customerId !== "all") params.append("customerId", customerId);
    if (itemName && itemName !== "all") params.append("itemName", itemName);
    if (invoiceNumber) params.append("invoiceNumber", invoiceNumber);
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);
    const queryStr = params.toString();
    return queryStr ? `/api/export-imei?${queryStr}` : "/api/export-imei";
  };

  const queryUrl = buildQueryUrl();

  const { data: imeiRecords = [], isLoading, refetch } = useQuery<ImeiRecord[]>({
    queryKey: [queryUrl],
    enabled: searchTriggered,
  });

  const handleSearch = () => {
    setSearchTriggered(true);
    refetch();
  };

  const handleClear = () => {
    setCustomerId("");
    setItemName("");
    setInvoiceNumber("");
    setDateFrom("");
    setDateTo("");
    setSearchTriggered(false);
  };

  const handleExportCSV = () => {
    if (imeiRecords.length === 0) return;
    
    const headers = ["IMEI", "Item", "Customer", "Invoice", "Date"];
    const rows = imeiRecords.map(r => [r.imei, r.itemName, r.customerName, r.invoiceNumber, r.saleDate]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imei-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const rows = imeiRecords.map(r => 
        `<tr><td>${r.imei}</td><td>${r.itemName}</td><td>${r.customerName}</td><td>${r.invoiceNumber}</td><td>${r.saleDate}</td></tr>`
      ).join("");
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>IMEI Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .company { font-size: 24px; font-weight: bold; }
            .title { font-size: 18px; margin-top: 10px; }
            .summary { margin: 20px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">Iqbal Electronics Co. WLL</div>
            <div class="title">IMEI Export Report</div>
          </div>
          <div class="summary">Total Records: ${imeiRecords.length}</div>
          <table>
            <thead>
              <tr><th>IMEI</th><th>Item</th><th>Customer</th><th>Invoice</th><th>Date</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportPDF = () => {
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      const rows = imeiRecords.map(r => 
        `<tr><td>${r.imei}</td><td>${r.itemName}</td><td>${r.customerName}</td><td>${r.invoiceNumber}</td><td>${r.saleDate}</td></tr>`
      ).join("");
      
      pdfWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>IMEI Export - ${new Date().toISOString().split("T")[0]}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .company { font-size: 24px; font-weight: bold; }
            .title { font-size: 18px; margin-top: 10px; }
            .date { font-size: 12px; color: #666; margin-top: 5px; }
            .summary { margin: 20px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background: #f5f5f5; font-weight: bold; }
            .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; }
            .instructions { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px; text-align: center; }
            .instructions p { margin: 5px 0; }
            @media print { .instructions { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">Iqbal Electronics Co. WLL</div>
            <div class="title">IMEI Export Report</div>
            <div class="date">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="summary">Total Records: ${imeiRecords.length}</div>
          <table>
            <thead>
              <tr><th>IMEI</th><th>Item</th><th>Customer</th><th>Invoice</th><th>Date</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Iqbal Electronics Co. WLL - IMEI Report</div>
          <div class="instructions">
            <p><strong>To save as PDF:</strong></p>
            <p>Press Ctrl+P (or Cmd+P on Mac), then select "Save as PDF" as the destination.</p>
          </div>
        </body>
        </html>
      `);
      pdfWindow.document.close();
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Smartphone className="h-6 w-6" />
          Export IMEI
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-testid="select-customer">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Item</Label>
              <Select value={itemName} onValueChange={setItemName}>
                <SelectTrigger data-testid="select-item">
                  <SelectValue placeholder="All items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All items</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                data-testid="input-invoice-number"
              />
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSearch} data-testid="button-search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={handleClear} data-testid="button-clear">
              Clear
            </Button>
            {imeiRecords.length > 0 && (
              <>
                <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handlePrint} data-testid="button-print">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {searchTriggered && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Results</span>
              <Badge variant="secondary">{imeiRecords.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : imeiRecords.length === 0 ? (
              <p className="text-muted-foreground">No IMEI records found matching the filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">IMEI</th>
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-left py-2 px-3">Customer</th>
                      <th className="text-left py-2 px-3">Invoice</th>
                      <th className="text-left py-2 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imeiRecords.map((record, index) => (
                      <tr key={`${record.imei}-${index}`} className="border-b" data-testid={`row-imei-${index}`}>
                        <td className="py-2 px-3 font-mono">{record.imei}</td>
                        <td className="py-2 px-3">{record.itemName}</td>
                        <td className="py-2 px-3">{record.customerName}</td>
                        <td className="py-2 px-3">{record.invoiceNumber}</td>
                        <td className="py-2 px-3">{record.saleDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
