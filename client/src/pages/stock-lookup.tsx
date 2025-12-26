import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { todayLocalISO } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, Loader2, ArrowUpDown, TrendingUp, TrendingDown, Box, Download, FileText } from "lucide-react";

interface StockBalanceItem {
  itemName: string;
  purchased: number;
  sold: number;
  openingStock: number;
  balance: number;
}

type SortField = "itemName" | "balance" | "purchased" | "sold";
type SortDirection = "asc" | "desc";

export default function StockLookupPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("itemName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data: stockBalance = [], isLoading } = useQuery<StockBalanceItem[]>({
    queryKey: ["/api/reports/stock-balance"],
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedStock = useMemo(() => {
    let filtered = stockBalance;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = stockBalance.filter((item) =>
        item.itemName.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === "itemName") {
        comparison = a.itemName.localeCompare(b.itemName);
      } else {
        comparison = a[sortField] - b[sortField];
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [stockBalance, searchQuery, sortField, sortDirection]);

  const totalItems = stockBalance.length;
  const totalBalance = stockBalance.reduce((sum, item) => sum + item.balance, 0);
  const lowStockItems = stockBalance.filter((item) => item.balance <= 5 && item.balance > 0).length;
  const outOfStockItems = stockBalance.filter((item) => item.balance <= 0).length;

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => handleSort(field)}
      data-testid={`sort-${field}`}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const handleExportExcel = () => {
    if (filteredAndSortedStock.length === 0) return;
    
    const headers = ["Item Name", "Purchased", "Sold", "Opening Stock", "Balance", "Status"];
    const rows = filteredAndSortedStock.map(item => {
      const status = item.balance <= 0 ? "Out of Stock" : item.balance <= 5 ? "Low Stock" : "In Stock";
      return [item.itemName, item.purchased, item.sold, item.openingStock, item.balance, status];
    });
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-report-${todayLocalISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (filteredAndSortedStock.length === 0) return;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const rows = filteredAndSortedStock.map(item => {
        const status = item.balance <= 0 ? "Out of Stock" : item.balance <= 5 ? "Low Stock" : "In Stock";
        return `<tr>
          <td style="padding: 8px; border: 1px solid #000;">${item.itemName}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: right;">${item.purchased.toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: right;">${item.sold.toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: right;">${item.openingStock.toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: right; font-weight: bold;">${item.balance.toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center;">${status}</td>
        </tr>`;
      }).join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stock Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { margin-bottom: 5px; }
            .subtitle { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { padding: 10px 8px; border: 1px solid #000; font-weight: bold; text-align: left; }
            th.right { text-align: right; }
            th.center { text-align: center; }
            .summary { margin-bottom: 20px; display: flex; gap: 20px; }
            .summary-item { padding: 10px 15px; border: 1px solid #000; border-radius: 4px; }
            .summary-label { font-size: 12px; color: #666; }
            .summary-value { font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Stock Report</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Items</div>
              <div class="summary-value">${totalItems}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Stock</div>
              <div class="summary-value">${totalBalance.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Low Stock</div>
              <div class="summary-value">${lowStockItems}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Out of Stock</div>
              <div class="summary-value">${outOfStockItems}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th class="right">Purchased</th>
                <th class="right">Sold</th>
                <th class="right">Opening</th>
                <th class="right">Balance</th>
                <th class="center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Stock
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and search available stock
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={stockBalance.length === 0}
            data-testid="button-export-excel"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={stockBalance.length === 0}
            data-testid="button-export-pdf"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-items">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-stock">{totalBalance.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="stat-low-stock">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">5 or fewer units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-out-of-stock">{outOfStockItems}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Stock List</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-stock"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAndSortedStock.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No items match your search" : "No stock data available"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortButton field="itemName">Item Name</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="purchased">Purchased</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="sold">Sold</SortButton>
                    </TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">
                      <SortButton field="balance">Balance</SortButton>
                    </TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedStock.map((item, index) => (
                    <TableRow key={item.itemName} data-testid={`row-stock-${index}`}>
                      <TableCell className="font-medium" data-testid={`text-item-name-${index}`}>
                        {item.itemName}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-purchased-${index}`}>
                        {item.purchased.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-sold-${index}`}>
                        {item.sold.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-opening-${index}`}>
                        {item.openingStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold" data-testid={`text-balance-${index}`}>
                        {item.balance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.balance <= 0 ? (
                          <Badge variant="destructive" data-testid={`badge-status-${index}`}>Out of Stock</Badge>
                        ) : item.balance <= 5 ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-status-${index}`}>Low Stock</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid={`badge-status-${index}`}>In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredAndSortedStock.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredAndSortedStock.length} of {totalItems} items
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
