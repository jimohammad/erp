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
import { MonthlyChart } from "./MonthlyChart";
import type { SalesOrderWithDetails } from "@shared/schema";

interface SalesReportingSectionProps {
  orders: SalesOrderWithDetails[];
  monthlyStats: { month: number; totalKwd: number; totalFx: number }[];
  isLoading: boolean;
  isStatsLoading: boolean;
  onViewOrder: (order: SalesOrderWithDetails) => void;
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

export function SalesReportingSection({
  orders,
  monthlyStats,
  isLoading,
  isStatsLoading,
  onViewOrder,
  onDeleteOrder,
  isAdmin,
}: SalesReportingSectionProps) {
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterDate, setFilterDate] = useState("");
  const [docsOnly, setDocsOnly] = useState(false);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    orders.forEach(order => {
      if (order.saleDate) {
        const year = new Date(order.saleDate).getFullYear();
        if (!isNaN(year)) yearSet.add(year);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.saleDate ? new Date(order.saleDate) : null;

      if (filterYear !== "all" && orderDate) {
        if (orderDate.getFullYear() !== parseInt(filterYear)) return false;
      }

      if (filterMonth !== "all" && orderDate) {
        if (orderDate.getMonth() + 1 !== parseInt(filterMonth)) return false;
      }

      if (filterDate && order.saleDate) {
        if (order.saleDate !== filterDate) return false;
      }

      if (docsOnly) {
        const hasDocs = order.invoiceFilePath || order.deliveryNoteFilePath || order.paymentReceiptFilePath;
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
          <CardTitle className="text-lg font-semibold">Sales Reporting & Archive</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Filter by date / month / year and review totals and documents.
          </p>
        </div>
        <div className="no-print flex flex-col md:flex-row gap-2 text-xs items-start md:items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[100px] text-xs" data-testid="select-sales-filter-year">
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
              <SelectTrigger className="w-[100px] text-xs" data-testid="select-sales-filter-month">
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
              data-testid="input-sales-filter-date"
            />
            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <Checkbox
                checked={docsOnly}
                onCheckedChange={(checked) => setDocsOnly(checked === true)}
                data-testid="checkbox-sales-docs-only"
              />
              Docs only
            </label>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearFilters}
              title="Clear filters"
              data-testid="button-sales-clear-filters"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePrint}
            data-testid="button-sales-print"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
            <p className="text-2xl font-semibold" data-testid="text-sales-kpi-count">{kpis.count}</p>
          </div>
          <div className="p-4 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue (KWD)</p>
            <p className="text-2xl font-semibold font-mono" data-testid="text-sales-kpi-kwd">{kpis.totalKwd}</p>
          </div>
          <div className="p-4 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue (FX)</p>
            <p className="text-2xl font-semibold font-mono" data-testid="text-sales-kpi-fx">{kpis.totalFx}</p>
          </div>
        </div>

        <div className="no-print">
          {isStatsLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <MonthlyChart data={monthlyStats} isLoading={isStatsLoading} title="Monthly Sales" />
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Sales Order Register</h3>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No sales orders found.</p>
              <p className="text-xs mt-1">Try adjusting your filters or create a new sales order.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] print:h-auto">
              <div className="space-y-2">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md bg-muted/30 hover-elevate"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid={`text-sales-order-date-${order.id}`}>
                          {formatDate(order.saleDate)}
                        </span>
                        {order.invoiceNumber && (
                          <Badge variant="secondary" className="text-xs">
                            {order.invoiceNumber}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {order.customer?.name || "No customer"}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {order.invoiceFilePath && (
                          <FileText className="h-3 w-3 text-muted-foreground" />
                        )}
                        {order.deliveryNoteFilePath && (
                          <Truck className="h-3 w-3 text-muted-foreground" />
                        )}
                        {order.paymentReceiptFilePath && (
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm" data-testid={`text-sales-order-kwd-${order.id}`}>
                        {formatNumber(order.totalKwd, 3)} KWD
                      </p>
                      {order.totalFx && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {formatNumber(order.totalFx, 2)} {order.fxCurrency}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 no-print">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewOrder(order)}
                        title="View details"
                        data-testid={`button-view-sales-order-${order.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && onDeleteOrder && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteOrder(order.id)}
                          title="Delete order"
                          data-testid={`button-delete-sales-order-${order.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
