import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, DollarSign, CreditCard, Package, Wallet, Building2, ArrowUpRight, ArrowDownLeft, Truck } from "lucide-react";

interface FinancialMetrics {
  totalReceivables: number;
  totalPayables: number;
  poInTransit: number;
  stockValue: number;
  cashInHand: number;
  bankBalances: number;
  totalSales: number;
  costOfGoodsSold: number;
  netProfit: number;
}

interface FinancialStanding {
  currentMonth: FinancialMetrics;
  lastMonth: FinancialMetrics;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function TrendIndicator({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  if (previous === 0 && current === 0) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  
  const diff = current - previous;
  const percentChange = previous !== 0 ? ((diff / Math.abs(previous)) * 100) : (current !== 0 ? 100 : 0);
  
  const isPositive = inverse ? diff < 0 : diff > 0;
  const isNeutral = diff === 0;
  
  if (isNeutral) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  
  return (
    <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      {diff > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      <span>{Math.abs(percentChange).toFixed(1)}%</span>
    </div>
  );
}

function MetricCard({ 
  title, 
  currentValue, 
  lastMonthValue, 
  icon: Icon, 
  colorClass = "text-foreground",
  inverse = false 
}: { 
  title: string; 
  currentValue: number; 
  lastMonthValue: number; 
  icon: React.ElementType; 
  colorClass?: string;
  inverse?: boolean;
}) {
  return (
    <Card data-testid={`card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-2xl font-bold" data-testid={`value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            {formatAmount(currentValue)} <span className="text-sm font-normal text-muted-foreground">KWD</span>
          </div>
          <TrendIndicator current={currentValue} previous={lastMonthValue} inverse={inverse} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Last month: {formatAmount(lastMonthValue)} KWD
        </p>
      </CardContent>
    </Card>
  );
}

export default function FinancialStandingPage() {
  const { data: standing, isLoading } = useQuery<FinancialStanding>({
    queryKey: ["/api/financial-standing"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!standing) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Unable to load financial standing data.</p>
      </div>
    );
  }

  const { currentMonth, lastMonth } = standing;
  
  const totalLiquidity = currentMonth.cashInHand + currentMonth.bankBalances;
  const lastMonthLiquidity = lastMonth.cashInHand + lastMonth.bankBalances;
  
  const netWorth = totalLiquidity + currentMonth.stockValue + currentMonth.totalReceivables + currentMonth.poInTransit - currentMonth.totalPayables;
  const lastMonthNetWorth = lastMonthLiquidity + lastMonth.stockValue + lastMonth.totalReceivables + lastMonth.poInTransit - lastMonth.totalPayables;

  return (
    <div className="p-6 space-y-6" data-testid="financial-standing-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Financial Standing</h1>
          <p className="text-muted-foreground">Company financial health overview - Current vs Last Month</p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Receivables"
          currentValue={currentMonth.totalReceivables}
          lastMonthValue={lastMonth.totalReceivables}
          icon={ArrowDownLeft}
          colorClass="text-green-600 dark:text-green-400"
        />
        <MetricCard
          title="Total Payables"
          currentValue={currentMonth.totalPayables}
          lastMonthValue={lastMonth.totalPayables}
          icon={ArrowUpRight}
          colorClass="text-red-600 dark:text-red-400"
          inverse={true}
        />
        <MetricCard
          title="PO In Transit"
          currentValue={currentMonth.poInTransit}
          lastMonthValue={lastMonth.poInTransit}
          icon={Truck}
          colorClass="text-orange-600 dark:text-orange-400"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Stock Value"
          currentValue={currentMonth.stockValue}
          lastMonthValue={lastMonth.stockValue}
          icon={Package}
          colorClass="text-blue-600 dark:text-blue-400"
        />
        <MetricCard
          title="Cash in Hand"
          currentValue={currentMonth.cashInHand}
          lastMonthValue={lastMonth.cashInHand}
          icon={Wallet}
          colorClass="text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          title="Bank Balances"
          currentValue={currentMonth.bankBalances}
          lastMonthValue={lastMonth.bankBalances}
          icon={Building2}
          colorClass="text-purple-600 dark:text-purple-400"
        />
      </div>

      <Card data-testid="card-monthly-profit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Monthly Profit Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-xl font-semibold" data-testid="value-total-sales">
                {formatAmount(currentMonth.totalSales)} KWD
              </p>
              <p className="text-xs text-muted-foreground">
                Last month: {formatAmount(lastMonth.totalSales)} KWD
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cost of Goods Sold</p>
              <p className="text-xl font-semibold" data-testid="value-cogs">
                {formatAmount(currentMonth.costOfGoodsSold)} KWD
              </p>
              <p className="text-xs text-muted-foreground">
                Last month: {formatAmount(lastMonth.costOfGoodsSold)} KWD
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <div className="flex items-center gap-2">
                <p className={`text-xl font-semibold ${currentMonth.netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="value-net-profit">
                  {formatAmount(currentMonth.netProfit)} KWD
                </p>
                <TrendIndicator current={currentMonth.netProfit} previous={lastMonth.netProfit} />
              </div>
              <p className="text-xs text-muted-foreground">
                Last month: {formatAmount(lastMonth.netProfit)} KWD
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-total-liquidity">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liquidity</CardTitle>
            <CreditCard className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-2xl font-bold" data-testid="value-total-liquidity">
                {formatAmount(totalLiquidity)} <span className="text-sm font-normal text-muted-foreground">KWD</span>
              </div>
              <TrendIndicator current={totalLiquidity} previous={lastMonthLiquidity} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cash + Bank Accounts</p>
          </CardContent>
        </Card>

        <Card data-testid="card-net-worth">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className={`text-2xl font-bold ${netWorth >= 0 ? "" : "text-red-600 dark:text-red-400"}`} data-testid="value-net-worth">
                {formatAmount(netWorth)} <span className="text-sm font-normal text-muted-foreground">KWD</span>
              </div>
              <TrendIndicator current={netWorth} previous={lastMonthNetWorth} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Liquidity + Stock + Receivables + PO Transit - Payables</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
