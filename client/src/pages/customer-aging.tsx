import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clock, AlertCircle } from "lucide-react";

interface CustomerAgingData {
  customerId: number;
  customerName: string;
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  totalBalance: number;
}

export default function CustomerAgingPage() {
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
                    <TableRow key={row.customerId} data-testid={`row-customer-${row.customerId}`}>
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
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
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
