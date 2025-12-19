import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  Banknote, 
  Users, 
  Printer,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calculator,
  Clock,
  Search,
  Building2,
  Download,
  FileText,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/contexts/BranchContext";

type StockBalanceItem = {
  itemName: string;
  purchased: number;
  sold: number;
  openingStock: number;
  balance: number;
};

type DailyCashFlow = {
  date: string;
  inAmount: number;
  outAmount: number;
  net: number;
  runningBalance: number;
};

type CustomerReportItem = {
  customerId: number;
  customerName: string;
  totalSales: number;
  totalPayments: number;
  balance: number;
};

type ProfitLossReport = {
  netSales: number;
  saleReturns: number;
  grossSales: number;
  costOfGoodsSold: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: { category: string; amount: number }[];
};

type StockAgingItem = {
  itemName: string;
  supplierName: string | null;
  totalQty: number;
  totalValue: number;
  qty0to30: number;
  value0to30: number;
  qty31to60: number;
  value31to60: number;
  qty61to90: number;
  value61to90: number;
  qty90plus: number;
  value90plus: number;
  oldestDate: string | null;
};

type StockAgingReport = {
  summary: {
    bucket0to30: { quantity: number; value: number };
    bucket31to60: { quantity: number; value: number };
    bucket61to90: { quantity: number; value: number };
    bucket90plus: { quantity: number; value: number };
    total: { quantity: number; value: number };
  };
  details: StockAgingItem[];
};

type Supplier = {
  id: number;
  name: string;
  partyType?: string | null;
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("stock");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agingItemSearch, setAgingItemSearch] = useState("");
  const [agingSupplierId, setAgingSupplierId] = useState<string>("");
  const [plStartDate, setPlStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [plEndDate, setPlEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [bankStartDate, setBankStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [bankEndDate, setBankEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [isDownloadingBankPack, setIsDownloadingBankPack] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { selectedBranchId } = useBranch();

  const { data: stockBalance = [], isLoading: stockLoading } = useQuery<StockBalanceItem[]>({
    queryKey: ["/api/reports/stock-balance"],
  });

  const cashFlowQueryKey = startDate || endDate 
    ? `/api/reports/daily-cash-flow?${new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      }).toString()}`
    : "/api/reports/daily-cash-flow";

  const { data: cashFlow = [], isLoading: cashFlowLoading } = useQuery<DailyCashFlow[]>({
    queryKey: [cashFlowQueryKey],
  });

  const { data: customerReport = [], isLoading: customerLoading } = useQuery<CustomerReportItem[]>({
    queryKey: ["/api/reports/customer-report"],
  });

  const plQueryKey = plStartDate && plEndDate 
    ? `/api/reports/profit-loss?${new URLSearchParams({
        startDate: plStartDate,
        endDate: plEndDate,
        ...(selectedBranchId && { branchId: selectedBranchId.toString() }),
      }).toString()}`
    : null;

  const { data: profitLoss, isLoading: plLoading, refetch: refetchPL } = useQuery<ProfitLossReport>({
    queryKey: [plQueryKey],
    enabled: !!plQueryKey,
  });

  // Stock Aging queries
  const { data: allSuppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
  
  // Filter to only show suppliers (not customers or salesmen)
  const suppliers = allSuppliers.filter(s => s.partyType === "supplier" || !s.partyType);

  const stockAgingQueryParams = new URLSearchParams();
  if (agingItemSearch) stockAgingQueryParams.set("itemName", agingItemSearch);
  if (agingSupplierId) stockAgingQueryParams.set("supplierId", agingSupplierId);
  const stockAgingQueryKey = `/api/reports/stock-aging${stockAgingQueryParams.toString() ? `?${stockAgingQueryParams.toString()}` : ""}`;

  const { data: stockAging, isLoading: stockAgingLoading } = useQuery<StockAgingReport>({
    queryKey: [stockAgingQueryKey],
  });

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const stockTotals = stockBalance.reduce(
    (acc, item) => ({
      openingStock: acc.openingStock + (item.openingStock || 0),
      purchased: acc.purchased + item.purchased,
      sold: acc.sold + item.sold,
      balance: acc.balance + item.balance,
    }),
    { openingStock: 0, purchased: 0, sold: 0, balance: 0 }
  );

  const cashFlowTotals = cashFlow.reduce(
    (acc, day) => ({
      inAmount: acc.inAmount + day.inAmount,
      outAmount: acc.outAmount + day.outAmount,
      net: acc.net + day.net,
    }),
    { inAmount: 0, outAmount: 0, net: 0 }
  );

  const customerTotals = customerReport.reduce(
    (acc, customer) => ({
      totalSales: acc.totalSales + customer.totalSales,
      totalPayments: acc.totalPayments + customer.totalPayments,
      balance: acc.balance + customer.balance,
    }),
    { totalSales: 0, totalPayments: 0, balance: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" data-testid="heading-reports">Reports</h2>
          <p className="text-sm text-muted-foreground">
            View stock balance, cash flow, and customer reports
          </p>
        </div>
        <Button onClick={handlePrint} data-testid="button-print-report">
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="no-print grid w-full grid-cols-6" data-testid="tabs-report-type">
          <TabsTrigger value="stock" data-testid="tab-stock">
            <Package className="h-4 w-4 mr-2" />
            Available Stock
          </TabsTrigger>
          <TabsTrigger value="stockaging" data-testid="tab-stockaging">
            <Clock className="h-4 w-4 mr-2" />
            Stock Aging
          </TabsTrigger>
          <TabsTrigger value="cashflow" data-testid="tab-cashflow">
            <Banknote className="h-4 w-4 mr-2" />
            Daily Cash Flow
          </TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="h-4 w-4 mr-2" />
            Customer Report
          </TabsTrigger>
          <TabsTrigger value="profitloss" data-testid="tab-profitloss">
            <Calculator className="h-4 w-4 mr-2" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="bankreports" data-testid="tab-bankreports">
            <Building2 className="h-4 w-4 mr-2" />
            Bank Reports
          </TabsTrigger>
        </TabsList>

        <div ref={printRef}>
          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Available Stock Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stockLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : stockBalance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No stock data available
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">Item Name</TableHead>
                          <TableHead className="text-right">Opening</TableHead>
                          <TableHead className="text-right">Purchased</TableHead>
                          <TableHead className="text-right">Sold</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockBalance.map((item, index) => (
                          <TableRow key={index} data-testid={`row-stock-${index}`}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="font-mono">
                                {item.openingStock || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="font-mono">
                                {item.purchased}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="font-mono">
                                {item.sold}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                variant={item.balance > 0 ? "default" : item.balance < 0 ? "destructive" : "secondary"}
                                className="font-mono"
                              >
                                {item.balance}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">{stockTotals.openingStock}</TableCell>
                          <TableCell className="text-right">{stockTotals.purchased}</TableCell>
                          <TableCell className="text-right">{stockTotals.sold}</TableCell>
                          <TableCell className="text-right">{stockTotals.balance}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stockaging" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Stock Aging Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="no-print flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="agingItemSearch">Item Name</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="agingItemSearch"
                        placeholder="Search items..."
                        value={agingItemSearch}
                        onChange={(e) => setAgingItemSearch(e.target.value)}
                        className="w-48 pl-8"
                        data-testid="input-aging-item-search"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="agingSupplier">Supplier</Label>
                    <Select value={agingSupplierId} onValueChange={(val) => setAgingSupplierId(val === "all" ? "" : val)}>
                      <SelectTrigger className="w-48" data-testid="select-aging-supplier">
                        <SelectValue placeholder="All Suppliers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Suppliers</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAgingItemSearch("");
                      setAgingSupplierId("");
                    }}
                    data-testid="button-clear-aging-filters"
                  >
                    Clear Filters
                  </Button>
                </div>

                {stockAgingLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : stockAging ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-5 gap-4">
                      <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                        <CardContent className="p-4 text-center">
                          <div className="text-sm text-muted-foreground">0-30 Days</div>
                          <div className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="text-bucket-0-30-qty">
                            {stockAging.summary.bucket0to30.quantity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAmount(stockAging.summary.bucket0to30.value)} KWD
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
                        <CardContent className="p-4 text-center">
                          <div className="text-sm text-muted-foreground">31-60 Days</div>
                          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400" data-testid="text-bucket-31-60-qty">
                            {stockAging.summary.bucket31to60.quantity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAmount(stockAging.summary.bucket31to60.value)} KWD
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                        <CardContent className="p-4 text-center">
                          <div className="text-sm text-muted-foreground">61-90 Days</div>
                          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400" data-testid="text-bucket-61-90-qty">
                            {stockAging.summary.bucket61to90.quantity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAmount(stockAging.summary.bucket61to90.value)} KWD
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                        <CardContent className="p-4 text-center">
                          <div className="text-sm text-muted-foreground">90+ Days</div>
                          <div className="text-2xl font-bold text-red-700 dark:text-red-400" data-testid="text-bucket-90-plus-qty">
                            {stockAging.summary.bucket90plus.quantity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAmount(stockAging.summary.bucket90plus.value)} KWD
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-2 border-primary/20">
                        <CardContent className="p-4 text-center">
                          <div className="text-sm text-muted-foreground">Total</div>
                          <div className="text-2xl font-bold" data-testid="text-total-qty">
                            {stockAging.summary.total.quantity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAmount(stockAging.summary.total.value)} KWD
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Details Table */}
                    {stockAging.details.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No stock aging data available
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[20%]">Item Name</TableHead>
                              <TableHead>Supplier</TableHead>
                              <TableHead className="text-right">0-30 Days</TableHead>
                              <TableHead className="text-right">31-60 Days</TableHead>
                              <TableHead className="text-right">61-90 Days</TableHead>
                              <TableHead className="text-right">90+ Days</TableHead>
                              <TableHead className="text-right">Total Qty</TableHead>
                              <TableHead className="text-right">Total Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stockAging.details.map((item, index) => (
                              <TableRow key={index} data-testid={`row-aging-${index}`}>
                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {item.supplierName || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.qty0to30 > 0 ? (
                                    <Badge variant="secondary" className="font-mono bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                      {item.qty0to30}
                                    </Badge>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.qty31to60 > 0 ? (
                                    <Badge variant="secondary" className="font-mono bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                      {item.qty31to60}
                                    </Badge>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.qty61to90 > 0 ? (
                                    <Badge variant="secondary" className="font-mono bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                                      {item.qty61to90}
                                    </Badge>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.qty90plus > 0 ? (
                                    <Badge variant="secondary" className="font-mono bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                      {item.qty90plus}
                                    </Badge>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {item.totalQty}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatAmount(item.totalValue)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-semibold">
                              <TableCell colSpan={2}>Total</TableCell>
                              <TableCell className="text-right">{stockAging.summary.bucket0to30.quantity}</TableCell>
                              <TableCell className="text-right">{stockAging.summary.bucket31to60.quantity}</TableCell>
                              <TableCell className="text-right">{stockAging.summary.bucket61to90.quantity}</TableCell>
                              <TableCell className="text-right">{stockAging.summary.bucket90plus.quantity}</TableCell>
                              <TableCell className="text-right">{stockAging.summary.total.quantity}</TableCell>
                              <TableCell className="text-right font-mono">{formatAmount(stockAging.summary.total.value)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No stock aging data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Banknote className="h-5 w-5" />
                  Daily Cash Flow Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="no-print flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                      data-testid="input-end-date"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    data-testid="button-clear-dates"
                  >
                    Clear Dates
                  </Button>
                </div>

                {cashFlowLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : cashFlow.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No cash flow data available
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">IN (KWD)</TableHead>
                          <TableHead className="text-right">OUT (KWD)</TableHead>
                          <TableHead className="text-right">Net (KWD)</TableHead>
                          <TableHead className="text-right">Running Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashFlow.map((day, index) => (
                          <TableRow key={index} data-testid={`row-cashflow-${index}`}>
                            <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {formatAmount(day.inAmount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                                <TrendingDown className="h-3 w-3" />
                                {formatAmount(day.outAmount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={day.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                {day.net >= 0 ? "+" : ""}{formatAmount(day.net)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatAmount(day.runningBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400">
                            {formatAmount(cashFlowTotals.inAmount)}
                          </TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400">
                            {formatAmount(cashFlowTotals.outAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cashFlowTotals.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {cashFlowTotals.net >= 0 ? "+" : ""}{formatAmount(cashFlowTotals.net)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {cashFlow.length > 0 && formatAmount(cashFlow[cashFlow.length - 1].runningBalance)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Customer Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customerLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : customerReport.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No customer data available
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Customer Name</TableHead>
                          <TableHead className="text-right">Total Sales (KWD)</TableHead>
                          <TableHead className="text-right">Total Payments (KWD)</TableHead>
                          <TableHead className="text-right">Balance Due (KWD)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerReport.map((customer) => (
                          <TableRow key={customer.customerId} data-testid={`row-customer-${customer.customerId}`}>
                            <TableCell className="font-medium">{customer.customerName}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatAmount(customer.totalSales)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatAmount(customer.totalPayments)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                variant={customer.balance > 0 ? "destructive" : customer.balance < 0 ? "default" : "secondary"}
                                className="font-mono"
                              >
                                {formatAmount(customer.balance)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">{formatAmount(customerTotals.totalSales)}</TableCell>
                          <TableCell className="text-right">{formatAmount(customerTotals.totalPayments)}</TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={customerTotals.balance > 0 ? "destructive" : customerTotals.balance < 0 ? "default" : "secondary"}
                            >
                              {formatAmount(customerTotals.balance)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profitloss" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="h-5 w-5" />
                  Profit & Loss Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="no-print flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="pl-start-date">From Date</Label>
                    <Input
                      id="pl-start-date"
                      type="date"
                      value={plStartDate}
                      onChange={(e) => setPlStartDate(e.target.value)}
                      className="w-40"
                      data-testid="input-pl-start-date"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pl-end-date">To Date</Label>
                    <Input
                      id="pl-end-date"
                      type="date"
                      value={plEndDate}
                      onChange={(e) => setPlEndDate(e.target.value)}
                      className="w-40"
                      data-testid="input-pl-end-date"
                    />
                  </div>
                  <Button onClick={() => refetchPL()} data-testid="button-refresh-pl">
                    Refresh
                  </Button>
                </div>

                {plLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : profitLoss ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="p-0">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Gross Sales</div>
                          <div className="text-xl font-bold" data-testid="text-gross-sales">
                            {formatAmount(profitLoss.grossSales)} KWD
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingDown className="h-3 w-3 text-red-500" />
                            Returns: {formatAmount(profitLoss.saleReturns)} KWD
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="p-0">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Net Sales</div>
                          <div className="text-xl font-bold text-green-600" data-testid="text-net-sales">
                            {formatAmount(profitLoss.netSales)} KWD
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Gross Sales - Returns
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="p-0">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Cost of Goods Sold</div>
                          <div className="text-xl font-bold text-red-600" data-testid="text-cogs">
                            {formatAmount(profitLoss.costOfGoodsSold)} KWD
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Purchases - Purchase Returns
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="p-0">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Gross Profit</div>
                          <div className={`text-2xl font-bold ${profitLoss.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-gross-profit">
                            {formatAmount(profitLoss.grossProfit)} KWD
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Net Sales - COGS
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="p-0">
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground">Operating Expenses</div>
                          <div className="text-2xl font-bold text-orange-600" data-testid="text-total-expenses">
                            {formatAmount(profitLoss.totalExpenses)} KWD
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total from all categories
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-2 border-primary/20">
                      <CardContent className="p-4 text-center">
                        <div className="text-sm text-muted-foreground">Net Profit / (Loss)</div>
                        <div className={`text-3xl font-bold ${profitLoss.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-profit">
                          {profitLoss.netProfit >= 0 ? '' : '('}{formatAmount(Math.abs(profitLoss.netProfit))}{profitLoss.netProfit >= 0 ? '' : ')'} KWD
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Gross Profit - Operating Expenses
                        </div>
                      </CardContent>
                    </Card>

                    {profitLoss.expensesByCategory.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Expenses Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Category</TableHead>
                                  <TableHead className="text-right">Amount (KWD)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {profitLoss.expensesByCategory.map((expense, index) => (
                                  <TableRow key={index} data-testid={`row-expense-${index}`}>
                                    <TableCell>{expense.category}</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {formatAmount(expense.amount)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-muted/50 font-semibold">
                                  <TableCell>Total Expenses</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {formatAmount(profitLoss.totalExpenses)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a date range and click Refresh to generate the report
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bankreports" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Bank Compliance Reports (A4)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate A4 formatted reports for bank documentation. This includes a cover summary, 
                    all sales invoices, and payment vouchers for the selected period.
                  </p>
                  
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="bank-start-date">Start Date</Label>
                      <Input
                        id="bank-start-date"
                        type="date"
                        value={bankStartDate}
                        onChange={(e) => setBankStartDate(e.target.value)}
                        className="w-[180px]"
                        data-testid="input-bank-start-date"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bank-end-date">End Date</Label>
                      <Input
                        id="bank-end-date"
                        type="date"
                        value={bankEndDate}
                        onChange={(e) => setBankEndDate(e.target.value)}
                        className="w-[180px]"
                        data-testid="input-bank-end-date"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!bankStartDate || !bankEndDate) return;
                        setIsDownloadingBankPack(true);
                        try {
                          const response = await fetch(
                            `/api/reports/bank-pack?startDate=${bankStartDate}&endDate=${bankEndDate}`,
                            { credentials: 'include' }
                          );
                          if (!response.ok) throw new Error("Failed to generate PDF");
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Bank_Report_${bankStartDate}_to_${bankEndDate}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Download error:", error);
                        } finally {
                          setIsDownloadingBankPack(false);
                        }
                      }}
                      disabled={!bankStartDate || !bankEndDate || isDownloadingBankPack}
                      data-testid="button-download-bank-pack"
                    >
                      {isDownloadingBankPack ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download Bank Pack (A4 PDF)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Report Contents
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">1</Badge>
                        <span>Cover Summary Page with totals</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">2</Badge>
                        <span>Section A: All Sales Invoices</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">3</Badge>
                        <span>Section B: All Payment Vouchers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">4</Badge>
                        <span>Net Cash Flow Summary</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Bank Compliance Features
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>Professional A4 format</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>Page numbers & headers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>Signature lines for approval</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>Multi-currency support</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            font-size: 12px;
          }
          .rounded-md {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
