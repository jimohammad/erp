import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, CreditCard, Banknote, BarChart3, Trophy, Zap, Clock, Target } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Legend, Cell } from "recharts";

interface SalesmanAnalytics {
  id: number;
  name: string;
  totalSales: number;
  invoiceCount: number;
  avgInvoiceValue: number;
  outstandingCredit: number;
  paymentsCollected: number;
  collectionEfficiency: number;
  lastSettlementDate: string | null;
  settlementStatus: 'overdue' | 'due_soon' | 'ok';
}

interface SalesmanEfficiency {
  id: number;
  name: string;
  totalGoodsIssued: number;
  rolling90DayGoods: number;
  creditLimit: number;
  creditUtilization: number;
  avgDaysGoodsHeld: number;
  goodsTurnoverRate: number;
  avgPaymentLagDays: number;
  collection30Days: number;
  collection60Days: number;
  collection90Days: number;
  cashReturnRate: number;
  efficiencyScore: number;
  rank: number;
  percentile: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' KWD';
}

function getRankBadge(rank: number, total: number) {
  const percentile = ((total - rank) / (total - 1)) * 100;
  if (rank === 1) return { label: "Top Performer", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
  if (percentile >= 75) return { label: "Top 25%", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
  if (percentile >= 50) return { label: "Top 50%", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
  if (percentile >= 25) return { label: "Bottom 50%", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
  return { label: "Needs Improvement", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function SalesmanAnalysisPage() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<SalesmanAnalytics[]>({
    queryKey: ["/api/salesmen/analytics"],
  });

  const { data: efficiency, isLoading: efficiencyLoading } = useQuery<SalesmanEfficiency[]>({
    queryKey: ["/api/salesmen/efficiency"],
  });

  const totals = analytics?.reduce((acc, s) => ({
    totalSales: acc.totalSales + s.totalSales,
    totalInvoices: acc.totalInvoices + s.invoiceCount,
    totalOutstanding: acc.totalOutstanding + s.outstandingCredit,
    totalCollected: acc.totalCollected + s.paymentsCollected,
  }), { totalSales: 0, totalInvoices: 0, totalOutstanding: 0, totalCollected: 0 });

  const overallEfficiency = totals && totals.totalSales > 0 
    ? (totals.totalCollected / totals.totalSales) * 100 
    : 0;

  // Prepare scatter plot data with safe defaults
  const scatterData = efficiency?.map((s, idx) => ({
    name: s.name,
    x: s.goodsTurnoverRate || 0,
    y: s.avgPaymentLagDays || 0,
    z: s.rolling90DayGoods || 0,
    score: s.efficiencyScore || 0,
    rank: s.rank || 0,
    color: COLORS[idx % COLORS.length],
  })).filter(d => d.x > 0 || d.y > 0) || []; // Only show salesmen with some activity

  const isLoading = analyticsLoading || efficiencyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Salesman Analysis</h1>
          <p className="text-muted-foreground">Performance metrics and efficiency comparison</p>
        </div>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="efficiency" data-testid="tab-efficiency">
            <Zap className="h-4 w-4 mr-2" />
            Efficiency Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-sales">
                  {formatCurrency(totals?.totalSales || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totals?.totalInvoices || 0} invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Credit</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-outstanding">
                  {formatCurrency(totals?.totalOutstanding || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending collection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payments Collected</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-collected">
                  {formatCurrency(totals?.totalCollected || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Deposited to company
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collection Efficiency</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-efficiency">
                  {overallEfficiency.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall rate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Salesman Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics || analytics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No salesmen found. Add salesmen in Party Master to track performance.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Total Sales</TableHead>
                        <TableHead className="text-right">Invoices</TableHead>
                        <TableHead className="text-right">Avg Invoice</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Efficiency</TableHead>
                        <TableHead className="text-center">Settlement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.map((salesman) => (
                        <TableRow key={salesman.id} data-testid={`row-salesman-${salesman.id}`}>
                          <TableCell className="font-medium">{salesman.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(salesman.totalSales)}</TableCell>
                          <TableCell className="text-right">{salesman.invoiceCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(salesman.avgInvoiceValue)}</TableCell>
                          <TableCell className="text-right">
                            <span className={salesman.outstandingCredit > 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                              {formatCurrency(salesman.outstandingCredit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(salesman.paymentsCollected)}</TableCell>
                          <TableCell className="text-right">
                            <span className={
                              salesman.collectionEfficiency >= 80 ? 'text-green-600 dark:text-green-400' :
                              salesman.collectionEfficiency >= 50 ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-600 dark:text-red-400'
                            }>
                              {salesman.collectionEfficiency.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                salesman.settlementStatus === 'overdue' ? 'destructive' :
                                salesman.settlementStatus === 'due_soon' ? 'secondary' :
                                'outline'
                              }
                              className={
                                salesman.settlementStatus === 'due_soon' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                                salesman.settlementStatus === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''
                              }
                            >
                              {salesman.settlementStatus === 'overdue' ? 'Overdue' :
                               salesman.settlementStatus === 'due_soon' ? 'Due Soon' : 'OK'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6">
          {/* Efficiency KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-top-performer">
                  {efficiency?.[0]?.name || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Score: {efficiency?.[0]?.efficiencyScore?.toFixed(1) || '0'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Payment Lag</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-lag">
                  {efficiency?.length 
                    ? (efficiency.reduce((sum, s) => sum + s.avgPaymentLagDays, 0) / efficiency.length).toFixed(1) 
                    : 0} days
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across all salesmen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">90-Day Goods Issued</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-90day-goods">
                  {formatCurrency(efficiency?.reduce((sum, s) => sum + s.rolling90DayGoods, 0) || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rolling 90-day total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Cash Return Rate</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-cash-return">
                  {efficiency?.length 
                    ? (efficiency.reduce((sum, s) => sum + s.cashReturnRate, 0) / efficiency.length).toFixed(1) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Payments vs goods issued
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Scatter Plot - Goods Turnover vs Payment Lag */}
          <Card>
            <CardHeader>
              <CardTitle>Efficiency Comparison Chart</CardTitle>
              <p className="text-sm text-muted-foreground">
                X-axis: Goods Turnover Rate (higher is better) | Y-axis: Payment Lag Days (lower is better)
              </p>
            </CardHeader>
            <CardContent>
              {scatterData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for comparison chart.
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Turnover Rate" 
                        tickFormatter={(v) => v.toFixed(0)}
                        label={{ value: 'Goods Turnover Rate', position: 'bottom', offset: 0 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Payment Lag" 
                        label={{ value: 'Payment Lag (days)', angle: -90, position: 'insideLeft' }}
                      />
                      <ZAxis type="number" dataKey="z" range={[100, 1000]} name="90-Day Goods" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ payload }) => {
                          if (payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-md p-2 shadow-md text-sm">
                                <p className="font-bold">{data.name}</p>
                                <p>Turnover: {data.x.toFixed(1)}</p>
                                <p>Payment Lag: {data.y.toFixed(1)} days</p>
                                <p>90-Day Goods: {formatCurrency(data.z)}</p>
                                <p>Efficiency Score: {data.score.toFixed(1)}</p>
                                <p>Rank: #{data.rank}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Scatter name="Salesmen" data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Efficiency Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Efficiency Leaderboard
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ranked by composite score (40% payment velocity, 30% turnover, 20% credit utilization, 10% cash return)
              </p>
            </CardHeader>
            <CardContent>
              {!efficiency || efficiency.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No efficiency data available.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Salesman</TableHead>
                        <TableHead className="text-right">90-Day Goods</TableHead>
                        <TableHead className="text-right">Turnover Rate</TableHead>
                        <TableHead className="text-right">Payment Lag</TableHead>
                        <TableHead className="text-right">Cash Return %</TableHead>
                        <TableHead className="text-right">Credit Util %</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-center">Tier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {efficiency.map((salesman) => {
                        const rankBadge = getRankBadge(salesman.rank, efficiency.length);
                        return (
                          <TableRow key={salesman.id} data-testid={`row-efficiency-${salesman.id}`}>
                            <TableCell className="font-bold text-lg">
                              {salesman.rank === 1 && <Trophy className="h-4 w-4 inline mr-1 text-yellow-500" />}
                              #{salesman.rank}
                            </TableCell>
                            <TableCell className="font-medium">{salesman.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(salesman.rolling90DayGoods)}</TableCell>
                            <TableCell className="text-right">
                              <span className={salesman.goodsTurnoverRate > 0 ? 'text-green-600 dark:text-green-400' : ''}>
                                {salesman.goodsTurnoverRate.toFixed(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={
                                salesman.avgPaymentLagDays <= 7 ? 'text-green-600 dark:text-green-400' :
                                salesman.avgPaymentLagDays <= 14 ? 'text-amber-600 dark:text-amber-400' :
                                salesman.avgPaymentLagDays > 0 ? 'text-red-600 dark:text-red-400' : ''
                              }>
                                {salesman.avgPaymentLagDays > 0 ? `${salesman.avgPaymentLagDays.toFixed(1)} days` : 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={
                                salesman.cashReturnRate >= 80 ? 'text-green-600 dark:text-green-400' :
                                salesman.cashReturnRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-600 dark:text-red-400'
                              }>
                                {salesman.cashReturnRate.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={
                                salesman.creditUtilization >= 40 && salesman.creditUtilization <= 70 ? 'text-green-600 dark:text-green-400' :
                                salesman.creditUtilization > 90 ? 'text-red-600 dark:text-red-400' :
                                'text-amber-600 dark:text-amber-400'
                              }>
                                {salesman.creditUtilization.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg">
                              {salesman.efficiencyScore.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={rankBadge.color}>
                                {rankBadge.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collection Curve Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Curve Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">
                How much of issued goods are collected within 30/60/90 days
              </p>
            </CardHeader>
            <CardContent>
              {!efficiency || efficiency.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No collection data available.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Salesman</TableHead>
                        <TableHead className="text-center">30-Day Collection</TableHead>
                        <TableHead className="text-center">60-Day Collection</TableHead>
                        <TableHead className="text-center">90-Day Collection</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {efficiency.map((salesman) => (
                        <TableRow key={salesman.id}>
                          <TableCell className="font-medium">{salesman.name}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full" 
                                  style={{ width: `${Math.min(100, salesman.collection30Days)}%` }}
                                />
                              </div>
                              <span className="text-sm">{salesman.collection30Days.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full" 
                                  style={{ width: `${Math.min(100, salesman.collection60Days)}%` }}
                                />
                              </div>
                              <span className="text-sm">{salesman.collection60Days.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 rounded-full" 
                                  style={{ width: `${Math.min(100, salesman.collection90Days)}%` }}
                                />
                              </div>
                              <span className="text-sm">{salesman.collection90Days.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
