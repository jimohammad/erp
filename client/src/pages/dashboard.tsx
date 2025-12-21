import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, TrendingUp, TrendingDown, ShoppingCart, Search, Loader2, ArrowRight, Wallet, Building2, Receipt, ClipboardCheck, PieChart as PieChartIcon } from "lucide-react";
import Sparkline from "@/components/Sparkline";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const LazySalesChart = lazy(() => import("@/components/SalesChart"));

interface DashboardStats {
  stockAmount: number;
  totalCredit: number;
  totalDebit: number;
  cashBalance: number;
  bankAccountsBalance: number;
  monthlySales: number;
  lastMonthSales: number;
  monthlyPurchases: number;
  salesTrend: number[];
  purchasesTrend: number[];
  totalExpenses: number;
}

interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  url: string;
}

interface SalesmanSettlement {
  id: number;
  name: string;
  phone: string | null;
  lastSettlementDate: string | null;
  daysRemaining: number;
  status: 'overdue' | 'due_soon' | 'ok';
}

interface TopSellingItem {
  name: string;
  totalSales: number;
  quantity: number;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: salesmenSettlements } = useQuery<SalesmanSettlement[]>({
    queryKey: ["/api/salesmen/settlement-status"],
  });

  const { data: topSellingItems } = useQuery<TopSellingItem[]>({
    queryKey: ["/api/dashboard/top-selling-items"],
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
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Card data-testid="card-stock-amount" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Stock Amount</CardTitle>
                <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/40">
                  <Package className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold" data-testid="text-stock-amount">
                  {formatCurrency(stats?.stockAmount || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">KWD</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-credit" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Receivables</CardTitle>
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400" data-testid="text-total-credit">
                  {formatCurrency(stats?.totalCredit || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">KWD</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-debit" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Payables</CardTitle>
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold text-red-600 dark:text-red-400" data-testid="text-total-debit">
                  {formatCurrency(stats?.totalDebit || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">KWD</p>
              </CardContent>
            </Card>

            <Card data-testid="card-cash-balance" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Cash in Hand</CardTitle>
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold" data-testid="text-cash-balance">
                  {formatCurrency(stats?.cashBalance || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">KWD</p>
              </CardContent>
            </Card>

            <Card data-testid="card-bank-accounts" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Bank Accounts</CardTitle>
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold" data-testid="text-bank-accounts">
                  {formatCurrency(stats?.bankAccountsBalance || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">KWD</p>
              </CardContent>
            </Card>

            <Card data-testid="card-monthly-purchases" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Purchases</CardTitle>
                <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
                  <ShoppingCart className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold" data-testid="text-monthly-purchases">
                  {formatCurrency(stats?.monthlyPurchases || 0)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">{currentMonthName}</p>
                  {stats?.purchasesTrend && stats.purchasesTrend.length > 0 && (
                    <div className="w-16">
                      <Sparkline data={stats.purchasesTrend} color="hsl(var(--secondary))" height={20} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <Card data-testid="card-monthly-sales" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <div>
                  <CardTitle className="text-xs font-medium text-muted-foreground">This Month Sales</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Last 7 days trend</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-coral-100 to-sky-100 dark:from-coral-900/40 dark:to-sky-900/40" style={{ background: 'linear-gradient(135deg, hsl(16 85% 95%), hsl(200 80% 95%))' }}>
                  <DollarSign className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold" data-testid="text-monthly-sales">
                      {formatCurrency(stats?.monthlySales || 0)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">KWD in {currentMonthName}</p>
                  </div>
                  {stats?.salesTrend && stats.salesTrend.length > 0 && (
                    <div className="flex-1 max-w-32">
                      <Sparkline data={stats.salesTrend} color="hsl(var(--primary))" height={32} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-expenses" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Expenses</CardTitle>
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                  <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl font-semibold text-orange-600 dark:text-orange-400" data-testid="text-total-expenses">
                  {formatCurrency(stats?.totalExpenses || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">KWD</p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-sales-comparison">
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Sales Comparison</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {lastMonthName} vs {currentMonthName}
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
            <CardContent className="p-4 pt-0">
              <div className="h-48">
                <Suspense fallback={
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }>
                  <LazySalesChart data={salesComparisonData} formatCurrency={formatCurrency} />
                </Suspense>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{lastMonthName}</p>
                  <p className="text-base font-bold">{formatCurrency(stats?.lastMonthSales || 0)} KWD</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{currentMonthName}</p>
                  <p className="text-base font-bold text-primary">{formatCurrency(stats?.monthlySales || 0)} KWD</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {topSellingItems && topSellingItems.length > 0 && (
              <Card data-testid="card-top-selling-items" className="h-80">
                <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
                      <PieChartIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Top Selling Items</CardTitle>
                      <p className="text-xs text-muted-foreground">By sales amount (KWD)</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topSellingItems.slice(0, 8).map(item => ({
                            name: item.name.length > 15 ? item.name.substring(0, 13) + '...' : item.name,
                            value: item.totalSales,
                            fullName: item.name,
                            quantity: item.quantity
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {topSellingItems.slice(0, 8).map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={[
                                'hsl(262, 83%, 58%)',
                                'hsl(199, 89%, 48%)',
                                'hsl(142, 76%, 36%)',
                                'hsl(24, 95%, 53%)',
                                'hsl(350, 89%, 60%)',
                                'hsl(47, 96%, 53%)',
                                'hsl(201, 96%, 32%)',
                                'hsl(322, 81%, 43%)',
                              ][index % 8]}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            `${formatCurrency(value)} KWD (${props.payload.quantity} units)`,
                            props.payload.fullName
                          ]}
                        />
                        <Legend 
                          layout="vertical" 
                          align="right" 
                          verticalAlign="middle"
                          formatter={(value: string) => <span className="text-xs">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-settlement-reminders" className="border-blue-200 dark:border-blue-800 h-80">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                    <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Salesman Account Settlement</CardTitle>
                    <p className="text-xs text-muted-foreground">Settlement due every 90 days</p>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className={
                    salesmenSettlements?.some(s => s.status === 'overdue') 
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                      : salesmenSettlements?.some(s => s.status === 'due_soon')
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                  }
                >
                  {salesmenSettlements?.length || 0} salesman{(salesmenSettlements?.length || 0) !== 1 ? 'men' : ''}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2 h-56 overflow-y-auto">
                  {salesmenSettlements && salesmenSettlements.length > 0 ? (
                    salesmenSettlements.map((salesman) => (
                      <div 
                        key={salesman.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover-elevate ${
                          salesman.status === 'overdue' 
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : salesman.status === 'due_soon'
                              ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                              : 'bg-green-50 dark:bg-green-900/20'
                        }`}
                        data-testid={`settlement-salesman-${salesman.id}`}
                        onClick={() => setLocation("/parties")}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{salesman.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {salesman.lastSettlementDate 
                              ? `Last: ${new Date(salesman.lastSettlementDate).toLocaleDateString()}`
                              : 'Never settled'}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              salesman.status === 'overdue'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                : salesman.status === 'due_soon'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            }`}
                          >
                            {salesman.status === 'overdue' 
                              ? salesman.daysRemaining === -999 
                                ? 'Never settled'
                                : `${Math.abs(salesman.daysRemaining)} days overdue`
                              : salesman.status === 'due_soon'
                                ? `${salesman.daysRemaining} days left`
                                : `${salesman.daysRemaining} days left`
                            }
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No salesmen registered</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
