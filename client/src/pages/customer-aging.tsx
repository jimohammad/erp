import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clock, AlertCircle, TrendingUp, ChevronDown, ChevronUp, Calendar, CreditCard, CheckCircle, XCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface CustomerAgingData {
  customerId: number;
  customerName: string;
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  totalBalance: number;
}

interface MonthlyTrend {
  month: string;
  sales: number;
  payments: number;
  balance: number;
}

interface PaymentMetrics {
  avgDaysToPay: number;
  paymentFrequency: number;
  totalTransactions: number;
  onTimePayments: number;
  latePayments: number;
  totalSalesAmount: number;
  totalPaymentsAmount: number;
  currentBalance: number;
}

function CustomerTrendPanel({ customerId, customerName }: { customerId: number; customerName: string }) {
  const { data: trends, isLoading: trendsLoading } = useQuery<MonthlyTrend[]>({
    queryKey: ["/api/reports/customer-trends", customerId],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PaymentMetrics>({
    queryKey: ["/api/reports/customer-metrics", customerId],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  };

  const formatMonth = (month: string) => {
    const date = new Date(month + "-01");
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const isLoading = trendsLoading || metricsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chartData = trends?.map(t => ({
    ...t,
    monthLabel: formatMonth(t.month),
  })) || [];

  const onTimeRate = metrics && (metrics.onTimePayments + metrics.latePayments > 0)
    ? Math.round((metrics.onTimePayments / (metrics.onTimePayments + metrics.latePayments)) * 100)
    : 0;

  return (
    <div className="border-t bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4" />
        <span className="font-semibold">Trend Analysis: {customerName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg Days to Pay</span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {metrics?.avgDaysToPay ? Math.round(metrics.avgDaysToPay) : 0} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Payment Frequency</span>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {metrics?.paymentFrequency ? metrics.paymentFrequency.toFixed(1) : 0}/mo
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">On-Time Rate</span>
              {onTimeRate >= 70 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className={`text-2xl font-bold ${onTimeRate >= 70 ? 'text-green-600' : onTimeRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {onTimeRate}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics?.onTimePayments || 0} on-time / {metrics?.latePayments || 0} late
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sales vs Payments (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="monthLabel" 
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value) + " KWD"}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    name="Sales"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="payments" 
                    stroke="#22c55e" 
                    name="Payments"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="monthLabel" 
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value) + " KWD"}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar 
                    dataKey="balance" 
                    fill="#f59e0b"
                    name="Net Balance"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total Sales:</span>
          <span className="ml-2 font-mono font-semibold">{formatCurrency(metrics?.totalSalesAmount || 0)} KWD</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Paid:</span>
          <span className="ml-2 font-mono font-semibold text-green-600">{formatCurrency(metrics?.totalPaymentsAmount || 0)} KWD</span>
        </div>
        <div>
          <span className="text-muted-foreground">Current Balance:</span>
          <span className="ml-2 font-mono font-semibold text-red-600">{formatCurrency(metrics?.currentBalance || 0)} KWD</span>
        </div>
        <div>
          <span className="text-muted-foreground">Transactions:</span>
          <span className="ml-2 font-semibold">{metrics?.totalTransactions || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function CustomerAgingPage() {
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

  const { data: agingData, isLoading } = useQuery<CustomerAgingData[]>({
    queryKey: ["/api/reports/customer-aging"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  };

  const totals = agingData?.reduce(
    (acc, row) => ({
      current: acc.current + row.current,
      days30: acc.days30 + row.days30,
      days60: acc.days60 + row.days60,
      days90Plus: acc.days90Plus + row.days90Plus,
      totalBalance: acc.totalBalance + row.totalBalance,
    }),
    { current: 0, days30: 0, days60: 0, days90Plus: 0, totalBalance: 0 }
  );

  const toggleExpand = (customerId: number) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Customer Aging Report</CardTitle>
            {agingData && (
              <Badge variant="secondary" className="ml-2">
                {agingData.length} customer{agingData.length !== 1 ? 's' : ''} with balance
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Click a row to view trend analysis
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !agingData || agingData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock className="h-12 w-12 mb-2 opacity-50" />
              <p>No outstanding customer balances</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background z-10 w-10"></TableHead>
                    <TableHead className="sticky top-0 bg-background z-10">Customer</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right">Current</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right">31-60 Days</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right">61-90 Days</TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right">
                      <div className="flex items-center justify-end gap-1">
                        90+ Days
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      </div>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background z-10 text-right font-bold">Total Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingData.map((row) => (
                    <Fragment key={row.customerId}>
                      <TableRow 
                        data-testid={`row-customer-${row.customerId}`}
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleExpand(row.customerId)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {expandedCustomer === row.customerId ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{row.customerName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.current > 0 ? formatCurrency(row.current) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.days30 > 0 ? (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              {formatCurrency(row.days30)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.days60 > 0 ? (
                            <span className="text-orange-600 dark:text-orange-400">
                              {formatCurrency(row.days60)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.days90Plus > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-semibold">
                              {formatCurrency(row.days90Plus)}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {formatCurrency(row.totalBalance)} KWD
                        </TableCell>
                      </TableRow>
                      {expandedCustomer === row.customerId && (
                        <TableRow key={`${row.customerId}-trend`}>
                          <TableCell colSpan={7} className="p-0">
                            <CustomerTrendPanel 
                              customerId={row.customerId} 
                              customerName={row.customerName}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell></TableCell>
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">
                      {totals && totals.current > 0 ? formatCurrency(totals.current) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-yellow-600 dark:text-yellow-400">
                      {totals && totals.days30 > 0 ? formatCurrency(totals.days30) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-orange-600 dark:text-orange-400">
                      {totals && totals.days60 > 0 ? formatCurrency(totals.days60) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                      {totals && totals.days90Plus > 0 ? formatCurrency(totals.days90Plus) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {totals ? formatCurrency(totals.totalBalance) : "0.000"} KWD
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
