import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Printer, FileText } from "lucide-react";
import type { Account } from "@shared/schema";

interface Transaction {
  date: string;
  description: string;
  type: string;
  amount: number;
  balance: number;
}

export default function AccountStatement() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/accounts", selectedAccountId, "transactions", { startDate, endDate }],
    enabled: !!selectedAccountId,
  });

  const selectedAccount = accounts.find(a => a.id.toString() === selectedAccountId);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalIn = transactions.filter(t => t.type === "IN").reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalOut = transactions.filter(t => t.type === "OUT").reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Account Statement - ${selectedAccount?.name || ""}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          .filters { margin-bottom: 20px; padding: 10px; border: 1px solid #000; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { font-weight: bold; }
          .text-right { text-align: right; }
          .totals { font-weight: bold; border-top: 2px solid #000; }
          .in { color: green; }
          .out { color: red; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Account Statement</h1>
        <p class="subtitle">${selectedAccount?.name || ""}</p>
        <div class="filters">
          ${startDate ? `<strong>From:</strong> ${startDate}` : ""}
          ${endDate ? ` <strong>To:</strong> ${endDate}` : ""}
          ${!startDate && !endDate ? "All Transactions" : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th class="text-right">Amount</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td class="${t.type === 'IN' ? 'in' : 'out'}">${t.type}</td>
                <td class="text-right ${t.type === 'IN' ? 'in' : 'out'}">${Math.abs(t.amount).toFixed(3)} KWD</td>
                <td class="text-right">${t.balance.toFixed(3)} KWD</td>
              </tr>
            `).join("")}
            <tr class="totals">
              <td colspan="3">Totals</td>
              <td class="text-right">IN: ${totalIn.toFixed(3)} | OUT: ${totalOut.toFixed(3)}</td>
              <td class="text-right">Closing: ${closingBalance.toFixed(3)} KWD</td>
            </tr>
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalIn = transactions.filter(t => t.type === "IN").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalOut = transactions.filter(t => t.type === "OUT").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Account Statement</h1>
        </div>
        <Button
          onClick={handlePrint}
          disabled={!selectedAccountId || transactions.length === 0}
          data-testid="button-print-account-statement"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Statement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Account & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger data-testid="select-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedAccountId && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedAccount?.name} - Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No transactions found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount (KWD)</TableHead>
                      <TableHead className="text-right">Balance (KWD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction, index) => (
                      <TableRow key={index} data-testid={`row-transaction-${index}`}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <span className={transaction.type === "IN" ? "text-green-600" : "text-red-600"}>
                            {transaction.type}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right ${transaction.type === "IN" ? "text-green-600" : "text-red-600"}`}>
                          {Math.abs(transaction.amount).toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.balance.toFixed(3)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={3}>Totals</TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600">IN: {totalIn.toFixed(3)}</span>
                        {" | "}
                        <span className="text-red-600">OUT: {totalOut.toFixed(3)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        Closing: {closingBalance.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
