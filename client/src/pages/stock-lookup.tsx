import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, Package, Loader2, ArrowUpDown, TrendingUp, TrendingDown, Box } from "lucide-react";

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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Stock Lookup
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quick search and view of available stock
          </p>
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
