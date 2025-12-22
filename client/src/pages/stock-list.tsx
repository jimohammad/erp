import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Printer, Package, AlertCircle, Search, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TokenVerification {
  valid: boolean;
  requiresPin: boolean;
}

interface StockItem {
  itemCode: string | null;
  itemName: string;
  category: string | null;
  currentStock: number;
  sellingPriceKwd: string | null;
  minStockLevel: number;
}

interface StockListData {
  stockList: StockItem[];
  generatedAt: string;
}

export default function StockListPage() {
  const params = useParams();
  const token = params.token;
  const [pin, setPin] = useState("");
  const [stockData, setStockData] = useState<StockListData | null>(null);
  const [pinError, setPinError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: tokenInfo, isLoading: tokenLoading, error: tokenError } = useQuery<TokenVerification>({
    queryKey: ["/api/public/stock-list", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/stock-list/${token}`);
      if (!response.ok) {
        throw new Error("Invalid link");
      }
      return response.json();
    },
    enabled: !!token,
  });

  const verifyMutation = useMutation({
    mutationFn: async (pinCode: string) => {
      const response = await apiRequest("POST", `/api/public/stock-list/${token}/verify`, { pin: pinCode });
      return response.json();
    },
    onSuccess: (data: StockListData) => {
      setStockData(data);
      setPinError("");
    },
    onError: (error: any) => {
      setPinError(error.message || "Invalid PIN. Please try again.");
    },
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    verifyMutation.mutate(pin);
  };

  const categories = stockData?.stockList 
    ? [...new Set(stockData.stockList.map(item => item.category).filter(Boolean))]
    : [];

  const filteredStock = stockData?.stockList.filter(item => {
    const matchesSearch = searchQuery === "" || 
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.itemCode && item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const handlePrint = () => {
    if (!stockData) return;
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      const rows = filteredStock.map(item => 
        `<tr>
          <td>${item.itemCode || "-"}</td>
          <td>${item.itemName}</td>
          <td>${item.category || "-"}</td>
          <td class="amount">${item.currentStock}</td>
          <td class="amount">${item.sellingPriceKwd ? parseFloat(item.sellingPriceKwd).toFixed(3) : "-"}</td>
        </tr>`
      ).join("");

      pdfWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stock List - Iqbal Electronics</title>
          <style>
            @media print { @page { margin: 1cm; } }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .company { font-size: 24px; font-weight: bold; }
            .title { font-size: 18px; margin-top: 10px; }
            .info { margin: 15px 0; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .amount { text-align: right; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            .low-stock { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">Iqbal Electronics Co. WLL</div>
            <div class="title">Stock List with Prices</div>
          </div>
          <div class="info">
            Generated on: ${new Date(stockData.generatedAt).toLocaleString()}<br/>
            ${selectedCategory ? `Category: ${selectedCategory}` : "All Categories"}<br/>
            Total Items: ${filteredStock.length}
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Item Name</th>
                <th>Category</th>
                <th class="amount">Stock</th>
                <th class="amount">Price (KWD)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">
            <p>Prices are subject to change without notice.</p>
          </div>
        </body>
        </html>
      `);
      pdfWindow.document.close();
      pdfWindow.print();
    }
  };

  const handleDownloadCSV = () => {
    if (!stockData) return;
    const headers = ["Code", "Item Name", "Category", "Stock", "Price (KWD)"];
    const csvRows = [
      headers.join(","),
      ...filteredStock.map(item => [
        item.itemCode || "",
        `"${item.itemName.replace(/"/g, '""')}"`,
        item.category || "",
        item.currentStock,
        item.sellingPriceKwd || "",
      ].join(","))
    ];
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-list-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tokenError || !tokenInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              This stock list link is invalid or has expired. Please contact the office for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Iqbal Electronics</CardTitle>
            <CardDescription>
              Enter your PIN to view the current stock list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN Code</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Enter 4-6 digit PIN"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ""));
                      setPinError("");
                    }}
                    className="pl-10"
                    data-testid="input-stock-pin"
                  />
                </div>
                {pinError && (
                  <p className="text-sm text-destructive">{pinError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyMutation.isPending || pin.length < 4}
                data-testid="button-verify-stock-pin"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                View Stock List
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-6xl mx-auto p-4">
        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Stock List
              </CardTitle>
              <CardDescription>
                Iqbal Electronics Co. WLL - Updated {new Date(stockData.generatedAt).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadCSV} data-testid="button-download-csv">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-stock">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-stock"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  data-testid="button-category-all"
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat as string)}
                    data-testid={`button-category-${cat}`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-2">
              Showing {filteredStock.length} of {stockData.stockList.length} items
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-sky-100 dark:bg-sky-900/30">
                    <tr>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Item Name</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-right p-3 font-medium">Stock</th>
                      <th className="text-right p-3 font-medium">Price (KWD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((item, index) => {
                      const isLowStock = item.currentStock <= item.minStockLevel && item.minStockLevel > 0;
                      return (
                        <tr 
                          key={item.itemName} 
                          className={`border-t ${index % 2 === 0 ? "" : "bg-muted/20"}`}
                          data-testid={`row-stock-${index}`}
                        >
                          <td className="p-3">{item.itemCode || "-"}</td>
                          <td className="p-3 font-medium">{item.itemName}</td>
                          <td className="p-3">
                            {item.category && (
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                            )}
                          </td>
                          <td className={`p-3 text-right ${isLowStock ? "text-destructive font-semibold" : ""}`}>
                            {item.currentStock}
                            {isLowStock && <span className="ml-1 text-xs">(Low)</span>}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {item.sellingPriceKwd ? parseFloat(item.sellingPriceKwd).toFixed(3) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStock.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No items found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
