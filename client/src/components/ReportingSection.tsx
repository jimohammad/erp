import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, FileText, Truck, CreditCard, Printer, X, Trash2 } from "lucide-react";
import type { PurchaseOrderWithDetails } from "@shared/schema";

interface ReportingSectionProps {
  orders: PurchaseOrderWithDetails[];
  monthlyStats: { month: number; totalKwd: number; totalFx: number }[];
  isLoading: boolean;
  isStatsLoading: boolean;
  onViewOrder: (order: PurchaseOrderWithDetails) => void;
  onDeleteOrder?: (orderId: number) => void;
  isAdmin?: boolean;
}

const MONTHS = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

export function ReportingSection({
  orders,
  monthlyStats,
  isLoading,
  isStatsLoading,
  onViewOrder,
  onDeleteOrder,
  isAdmin,
}: ReportingSectionProps) {
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterDate, setFilterDate] = useState("");
  const [docsOnly, setDocsOnly] = useState(false);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    orders.forEach(order => {
      if (order.purchaseDate) {
        const year = new Date(order.purchaseDate).getFullYear();
        if (!isNaN(year)) yearSet.add(year);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.purchaseDate ? new Date(order.purchaseDate) : null;

      if (filterYear !== "all" && orderDate) {
        if (orderDate.getFullYear() !== parseInt(filterYear)) return false;
      }

      if (filterMonth !== "all" && orderDate) {
        if (orderDate.getMonth() + 1 !== parseInt(filterMonth)) return false;
      }

      if (filterDate && order.purchaseDate) {
        if (order.purchaseDate !== filterDate) return false;
      }

      if (docsOnly) {
        const hasDocs = order.invoiceFilePath || order.deliveryNoteFilePath || order.ttCopyFilePath;
        if (!hasDocs) return false;
      }

      return true;
    });
  }, [orders, filterYear, filterMonth, filterDate, docsOnly]);

  const kpis = useMemo(() => {
    let totalKwd = 0;
    let totalFx = 0;

    filteredOrders.forEach(order => {
      totalKwd += parseFloat(order.totalKwd || "0");
      totalFx += parseFloat(order.totalFx || "0");
    });

    return {
      count: filteredOrders.length,
      totalKwd: totalKwd.toFixed(3),
      totalFx: totalFx.toFixed(2),
    };
  }, [filteredOrders]);

  const clearFilters = () => {
    setFilterYear("all");
    setFilterMonth("all");
    setFilterDate("");
    setDocsOnly(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatNumber = (value: string | null, decimals: number) => {
    if (!value) return "—";
    return Number(value).toFixed(decimals);
  };

  return (
    <Card className="print:shadow-none print:border-none">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Reporting & Archive</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Filter by date / month / year and review totals and documents.
          </p>
        </div>
        <div className="no-print flex flex-col md:flex-row gap-2 text-xs items-start md:items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[100px] text-xs" data-testid="select-filter-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Year: All</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[100px] text-xs" data-testid="select-filter-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Month: All</SelectItem>
                {MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-[140px] text-xs"
              data-testid="input-filter-date"
            />
            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <Checkbox
                checked={docsOnly}
                onCheckedChange={(checked) => setDocsOnly(!!checked)}
                data-testid="checkbox-docs-only"
              />
              <span>Docs only</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
              data-testid="button-clear-filters"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="text-xs bg-foreground text-background hover:bg-foreground/90"
              data-testid="button-print"
            >
              <Printer className="h-3 w-3 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-muted-foreground mb-1">Records (Filtered)</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-xl font-semibold tabular-nums" data-testid="kpi-count">
                {kpis.count}
              </p>
            )}
          </div>
          <div className="bg-muted/50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-muted-foreground mb-1">Total KWD (Filtered)</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-semibold font-mono tabular-nums" data-testid="kpi-kwd">
                {kpis.totalKwd}
              </p>
            )}
          </div>
          <div className="bg-muted/50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-muted-foreground mb-1">Total FX (Filtered)</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-semibold font-mono tabular-nums" data-testid="kpi-fx">
                {kpis.totalFx}
              </p>
            )}
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <ScrollArea className="max-h-[420px]">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Invoice #</th>
                  <th className="px-3 py-2 text-left">Supplier</th>
                  <th className="px-3 py-2 text-left">Items</th>
                  <th className="px-3 py-2 text-right">Total KWD</th>
                  <th className="px-3 py-2 text-right">FX Rate</th>
                  <th className="px-3 py-2 text-right">Total FX</th>
                  <th className="px-3 py-2 text-center">Docs</th>
                  <th className="px-3 py-2 text-center">GRN Date</th>
                  <th className="px-3 py-2 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-8" /></td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      No purchase orders captured yet.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30" data-testid={`order-row-${order.id}`}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {formatDate(order.purchaseDate)}
                      </td>
                      <td className="px-3 py-3 font-mono">
                        {order.invoiceNumber || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {order.supplier?.name || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-muted-foreground">
                          {order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatNumber(order.totalKwd, 3)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                        {formatNumber(order.fxRate, 4)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatNumber(order.totalFx, 2)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center gap-1">
                          {order.invoiceFilePath && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              <FileText className="h-3 w-3" />
                            </Badge>
                          )}
                          {order.deliveryNoteFilePath && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              <Truck className="h-3 w-3" />
                            </Badge>
                          )}
                          {order.ttCopyFilePath && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              <CreditCard className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap text-muted-foreground">
                        {formatDate(order.grnDate)}
                      </td>
                      <td className="px-3 py-3 text-center no-print">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onViewOrder(order)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && onDeleteOrder && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onDeleteOrder(order.id)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-order-${order.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
