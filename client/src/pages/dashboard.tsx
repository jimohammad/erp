import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, TrendingUp, TrendingDown, ShoppingCart, Search, Loader2, ArrowRight, Wallet, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DashboardStats {
  stockAmount: number;
  totalCredit: number;
  totalDebit: number;
  cashBalance: number;
  bankAccountsBalance: number;
  monthlySales: number;
  lastMonthSales: number;
  monthlyPurchases: number;
}

interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  url: string;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    setLocation(result.url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  };

  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString("default", { month: "short" });
  const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const lastMonthName = lastMonthDate.toLocaleString("default", { month: "short" });

  const salesComparisonData = [
    {
      name: lastMonthName,
      sales: stats?.lastMonthSales || 0,
    },
    {
      name: currentMonthName,
      sales: stats?.monthlySales || 0,
    },
  ];

  const salesChange = stats?.lastMonthSales && stats.lastMonthSales > 0
    ? ((stats.monthlySales - stats.lastMonthSales) / stats.lastMonthSales * 100).toFixed(1)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers, suppliers, items, invoices..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          data-testid="input-global-search"
        />
        {showResults && searchQuery.length >= 2 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto">
            <CardContent className="p-2">
              {searchLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.type}-${result.id}-${index}`}
                      className="flex items-center justify-between p-2 rounded-md cursor-pointer hover-elevate"
                      onClick={() => handleResultClick(result)}
                      data-testid={`search-result-${result.type.toLowerCase()}-${result.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          {result.type}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No results found
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business</p>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card data-testid="card-stock-amount">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Amount</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-stock-amount">
                  {formatCurrency(stats?.stockAmount || 0)} KWD
                </div>
                <p className="text-xs text-muted-foreground">Total inventory value</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-credit">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-total-credit">
                  {formatCurrency(stats?.totalCredit || 0)} KWD
                </div>
                <p className="text-xs text-muted-foreground">All incoming payments</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-debit">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-total-debit">
                  {formatCurrency(stats?.totalDebit || 0)} KWD
                </div>
                <p className="text-xs text-muted-foreground">All outgoing payments</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card data-testid="card-cash-balance">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-cash-balance">
                  {formatCurrency(stats?.cashBalance || 0)} KWD
                </div>
                <p className="text-xs text-muted-foreground">Cash in hand</p>
              </CardContent>
            </Card>

            <Card data-testid="card-bank-accounts">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-bank-accounts">
                  {formatCurrency(stats?.bankAccountsBalance || 0)} KWD
                </div>
                <p className="text-xs text-muted-foreground">NBK, CBK, Knet, Wamd</p>
              </CardContent>
            </Card>

            <Card data-testid="card-monthly-purchases">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Purchases</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-monthly-purchases">
                  {formatCurrency(stats?.monthlyPurchases || 0)} KWD
                </div>
                <p className="text-xs text-muted-foreground">{currentMonthName} {currentDate.getFullYear()}</p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-sales-comparison">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">Sales Comparison</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {lastMonthName} vs {currentMonthName} {currentDate.getFullYear()}
                </p>
              </div>
              {salesChange !== null && (
                <Badge 
                  variant="secondary" 
                  className={Number(salesChange) >= 0 ? "text-green-600" : "text-red-600"}
                >
                  {Number(salesChange) >= 0 ? "+" : ""}{salesChange}%
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${formatCurrency(value)} KWD`, "Sales"]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                      <Cell fill="hsl(var(--muted-foreground))" />
                      <Cell fill="hsl(var(--primary))" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{lastMonthName} Sales</p>
                  <p className="text-xl font-bold">{formatCurrency(stats?.lastMonthSales || 0)} KWD</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{currentMonthName} Sales</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(stats?.monthlySales || 0)} KWD</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
