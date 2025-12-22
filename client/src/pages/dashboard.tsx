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

            <Card data-testid="card-total-expenses" className="p-0 overflow-visible">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Expenses</CardTitle>
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                  <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400" data-testid="text-total-expenses">
                  {formatCurrency(stats?.totalExpenses || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">KWD</p>
              </CardContent>
            </Card>

            </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <Card data-testid="card-sales-comparison">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
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
              <CardContent className="p-3 pt-0">
                <div className="h-32">
                  <Suspense fallback={
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  }>
                    <LazySalesChart data={salesComparisonData} formatCurrency={formatCurrency} />
                  </Suspense>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">{lastMonthName}</p>
                    <p className="text-sm font-bold">{formatCurrency(stats?.lastMonthSales || 0)} KWD</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">{currentMonthName}</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(stats?.monthlySales || 0)} KWD</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {topSellingItems && topSellingItems.length > 0 && (
              <Card data-testid="card-top-selling-items">
                <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40">
                      <PieChartIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Top Selling Items</CardTitle>
                      <p className="text-xs text-muted-foreground">By sales amount</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topSellingItems.slice(0, 6).map(item => ({
                            name: item.name.length > 12 ? item.name.substring(0, 10) + '..' : item.name,
                            value: item.totalSales,
                            fullName: item.name,
                            quantity: item.quantity
                          }))}
                          cx="35%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={55}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {topSellingItems.slice(0, 6).map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={[
                                'hsl(262, 83%, 58%)',
                                'hsl(199, 89%, 48%)',
                                'hsl(142, 76%, 36%)',
                                'hsl(24, 95%, 53%)',
                                'hsl(350, 89%, 60%)',
                                'hsl(47, 96%, 53%)',
                              ][index % 6]}
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
                          formatter={(value: string) => <span className="text-[10px]">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card data-testid="card-settlement-reminders" className="border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                    <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Settlement Calendar</CardTitle>
                    <p className="text-xs text-muted-foreground">90-day settlement cycle overview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Overdue</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Soon</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>OK</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {(() => {
                  const months = Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + i);
                    return {
                      key: `${date.getFullYear()}-${date.getMonth()}`,
                      label: date.toLocaleString('default', { month: 'short' }),
                      year: date.getFullYear(),
                      month: date.getMonth(),
                      isCurrent: i === 0,
                    };
                  });

                  const getSettlementMonth = (salesman: SalesmanSettlement) => {
                    if (salesman.status === 'overdue') return months[0];
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + salesman.daysRemaining);
                    return months.find(m => m.year === dueDate.getFullYear() && m.month === dueDate.getMonth()) || months[months.length - 1];
                  };

                  const salesmenByMonth = months.map(month => ({
                    ...month,
                    salesmen: (salesmenSettlements || []).filter(s => {
                      const targetMonth = getSettlementMonth(s);
                      return targetMonth.key === month.key;
                    }),
                  }));

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-1">
                        {salesmenByMonth.map((month) => (
                          <div 
                            key={month.key} 
                            className={`flex flex-col items-center p-1 rounded-md ${month.isCurrent ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          >
                            <span className={`text-[10px] font-medium ${month.isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                              {month.label}
                            </span>
                            <div className="flex flex-col gap-0.5 mt-1 min-h-[40px] items-center">
                              {month.salesmen.length > 0 ? (
                                month.salesmen.slice(0, 4).map((s) => (
                                  <div
                                    key={s.id}
                                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-opacity hover:ring-2 hover:ring-offset-1 ${
                                      s.status === 'overdue' ? 'bg-red-500 hover:ring-red-300' :
                                      s.status === 'due_soon' ? 'bg-amber-500 hover:ring-amber-300' :
                                      'bg-green-500 hover:ring-green-300'
                                    }`}
                                    title={`${s.name}: ${s.status === 'overdue' ? 'Overdue' : `${s.daysRemaining} days`}`}
                                    onClick={() => setLocation("/parties")}
                                    data-testid={`dot-salesman-${s.id}`}
                                  />
                                ))
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                              )}
                              {month.salesmen.length > 4 && (
                                <span className="text-[8px] text-muted-foreground">+{month.salesmen.length - 4}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {salesmenSettlements && salesmenSettlements.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {salesmenSettlements.map((salesman) => (
                              <div 
                                key={salesman.id}
                                className="flex items-center gap-2 p-2 rounded-md text-xs cursor-pointer hover-elevate border"
                                onClick={() => setLocation("/parties")}
                                data-testid={`settlement-salesman-${salesman.id}`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                  salesman.status === 'overdue' ? 'bg-red-500' :
                                  salesman.status === 'due_soon' ? 'bg-amber-500' :
                                  'bg-green-500'
                                }`} />
                                <span className="font-medium truncate flex-1">{salesman.name}</span>
                                <span className={`whitespace-nowrap ${
                                  salesman.status === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' :
                                  salesman.status === 'due_soon' ? 'text-amber-600 dark:text-amber-400' :
                                  'text-muted-foreground'
                                }`}>
                                  {salesman.status === 'overdue' 
                                    ? salesman.daysRemaining === -999 ? 'Never' : `${Math.abs(salesman.daysRemaining)}d late`
                                    : `${salesman.daysRemaining}d`
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(!salesmenSettlements || salesmenSettlements.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-2">No salesmen registered</p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
