import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, CreditCard, Banknote, BarChart3 } from "lucide-react";

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

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' KWD';
}

export default function SalesmanAnalysisPage() {
  const { data: analytics, isLoading } = useQuery<SalesmanAnalytics[]>({
    queryKey: ["/api/salesmen/analytics"],
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
          <p className="text-muted-foreground">Performance metrics and efficiency tracking</p>
        </div>
      </div>

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
    </div>
  );
}
