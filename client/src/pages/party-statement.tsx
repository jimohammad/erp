import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Printer,
  Loader2,
  FileText,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { Supplier } from "@shared/schema";

type PartyTransaction = {
  id: number;
  date: string;
  type: "purchase" | "sale" | "payment_in" | "payment_out" | "return";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export default function PartyStatementPage() {
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: parties = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);
  
  const queryString = queryParams.toString();
  const statementUrl = selectedPartyId 
    ? `/api/reports/party-statement/${selectedPartyId}${queryString ? `?${queryString}` : ""}`
    : null;

  const { data: transactions = [], isLoading } = useQuery<PartyTransaction[]>({
    queryKey: [statementUrl],
    enabled: !!selectedPartyId,
  });

  const selectedParty = parties.find(p => p.id.toString() === selectedPartyId);

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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "purchase": return "Purchase";
      case "sale": return "Sale";
      case "payment_in": return "Payment IN";
      case "payment_out": return "Payment OUT";
      case "return": return "Return";
      default: return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "purchase": return "default";
      case "sale": return "default";
      case "payment_in": return "secondary";
      case "payment_out": return "secondary";
      case "return": return "outline";
      default: return "secondary";
    }
  };

  const totals = transactions.reduce(
    (acc, t) => ({
      debit: acc.debit + t.debit,
      credit: acc.credit + t.credit,
    }),
    { debit: 0, credit: 0 }
  );

  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" data-testid="heading-party-statement">Party Statement</h2>
          <p className="text-sm text-muted-foreground">
            View all transactions for a party with date filtering
          </p>
        </div>
        <Button onClick={handlePrint} disabled={!selectedPartyId} data-testid="button-print-statement">
          <Printer className="h-4 w-4 mr-2" />
          Print Statement
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Party Statement Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="no-print flex flex-wrap items-end gap-4">
            <div className="space-y-1 min-w-[250px]">
              <Label htmlFor="party">Select Party</Label>
              <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
                <SelectTrigger id="party" data-testid="select-party">
                  <SelectValue placeholder="Select a party..." />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((party) => (
                    <SelectItem key={party.id} value={party.id.toString()}>
                      {party.name} ({party.partyType === "customer" ? "Customer" : "Supplier"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          {selectedParty && (
            <div className="print-only hidden print:block mb-4 pb-4 border-b">
              <h3 className="text-lg font-semibold">{selectedParty.name}</h3>
              <p className="text-sm text-muted-foreground">
                Type: {selectedParty.partyType === "customer" ? "Customer" : "Supplier"}
                {startDate && ` | From: ${formatDate(startDate)}`}
                {endDate && ` | To: ${formatDate(endDate)}`}
              </p>
            </div>
          )}

          {!selectedPartyId ? (
            <div className="text-center py-8 text-muted-foreground">
              Please select a party to view their statement
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this party
            </div>
          ) : (
            <div ref={printRef}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[120px]">Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-[120px]">Debit (KWD)</TableHead>
                      <TableHead className="text-right w-[120px]">Credit (KWD)</TableHead>
                      <TableHead className="text-right w-[120px]">Balance (KWD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t, index) => (
                      <TableRow key={`${t.type}-${t.id}`} data-testid={`row-transaction-${index}`}>
                        <TableCell className="font-medium">{formatDate(t.date)}</TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(t.type) as any} className="text-xs">
                            {getTypeLabel(t.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{t.reference}</TableCell>
                        <TableCell className="text-muted-foreground">{t.description}</TableCell>
                        <TableCell className="text-right">
                          {t.debit > 0 && (
                            <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {formatAmount(t.debit)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.credit > 0 && (
                            <span className="text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {formatAmount(t.credit)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={t.balance >= 0 ? "" : "text-red-600 dark:text-red-400"}>
                            {formatAmount(t.balance)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {formatAmount(totals.debit)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {formatAmount(totals.credit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={closingBalance >= 0 ? "secondary" : "destructive"}>
                          {formatAmount(closingBalance)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
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
