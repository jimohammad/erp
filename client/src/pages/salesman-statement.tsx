import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Printer, Building2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SalesmanInfo {
  name: string;
  requiresPin: boolean;
}

interface StatementEntry {
  id: number;
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface StatementData {
  salesman: {
    id: number;
    name: string;
    phone?: string;
    area?: string;
  };
  transactions: StatementEntry[];
  currentBalance: number;
}

export default function SalesmanStatementPage() {
  const params = useParams();
  const token = params.token;
  const [pin, setPin] = useState("");
  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [pinError, setPinError] = useState("");

  const { data: salesmanInfo, isLoading: tokenLoading, error: tokenError } = useQuery<SalesmanInfo>({
    queryKey: ["/api/public/salesman-statement", token],
    enabled: !!token,
  });

  const verifyMutation = useMutation({
    mutationFn: async (pinCode: string) => {
      const response = await apiRequest("POST", `/api/public/salesman-statement/${token}/verify`, { pin: pinCode });
      return response.json();
    },
    onSuccess: (data: StatementData) => {
      setStatementData(data);
      setPinError("");
    },
    onError: (error: any) => {
      setPinError(error.message || "Invalid PIN. Please try again.");
    },
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    verifyMutation.mutate(pin);
  };

  const handlePrint = () => {
    if (!statementData) return;
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      const rows = statementData.transactions.map(e => 
        `<tr>
          <td>${e.date}</td>
          <td>${e.description}</td>
          <td>${e.reference || "-"}</td>
          <td class="amount">${e.debit > 0 ? e.debit.toFixed(3) : "-"}</td>
          <td class="amount">${e.credit > 0 ? e.credit.toFixed(3) : "-"}</td>
          <td class="amount">${e.balance.toFixed(3)}</td>
        </tr>`
      ).join("");

      pdfWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Statement - ${statementData.salesman.name}</title>
          <style>
            @media print { @page { margin: 1cm; } }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .company { font-size: 24px; font-weight: bold; }
            .title { font-size: 18px; margin-top: 10px; }
            .salesman-info { margin: 20px 0; padding: 15px; border: 1px solid #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .amount { text-align: right; }
            .summary { margin-top: 20px; text-align: right; font-size: 14px; }
            .balance { font-weight: bold; font-size: 18px; margin-top: 10px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">Iqbal Electronics Co. WLL</div>
            <div class="title">Salesman Account Statement</div>
          </div>
          <div class="salesman-info">
            <strong>Salesman:</strong> ${statementData.salesman.name}<br/>
            ${statementData.salesman.phone ? `<strong>Phone:</strong> ${statementData.salesman.phone}<br/>` : ""}
            ${statementData.salesman.area ? `<strong>Area:</strong> ${statementData.salesman.area}<br/>` : ""}
            <strong>Statement Date:</strong> ${new Date().toLocaleDateString()}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th class="amount">Debit</th>
                <th class="amount">Credit</th>
                <th class="amount">Balance</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="summary">
            <div class="balance">Current Balance: ${statementData.currentBalance.toFixed(3)} KWD</div>
          </div>
          <div class="footer">
            <p>This statement is generated electronically and is valid without signature.</p>
          </div>
        </body>
        </html>
      `);
      pdfWindow.document.close();
      pdfWindow.print();
    }
  };

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tokenError || !salesmanInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              This statement link is invalid or has expired. Please contact the office for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statementData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Account Statement</CardTitle>
            <CardDescription>
              Hello <span className="font-medium text-foreground">{salesmanInfo.name}</span>, enter your PIN to view your account statement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                    setPinError("");
                  }}
                  className="text-center text-2xl tracking-widest"
                  data-testid="input-pin"
                />
                {pinError && (
                  <p className="text-sm text-destructive">{pinError}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={verifyMutation.isPending}
                data-testid="button-verify-pin"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                View Statement
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Iqbal Electronics Co. WLL</CardTitle>
                <CardDescription>Account Statement for {statementData.salesman.name}</CardDescription>
              </div>
            </div>
            <Button onClick={handlePrint} variant="outline" data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Salesman</p>
              <p className="text-lg font-semibold">{statementData.salesman.name}</p>
              {statementData.salesman.phone && (
                <p className="text-sm text-muted-foreground">{statementData.salesman.phone}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Area</p>
              <p className="text-lg font-semibold">{statementData.salesman.area || "Not specified"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className={`text-2xl font-bold ${statementData.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {statementData.currentBalance.toFixed(3)} KWD
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {statementData.transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium">Date</th>
                      <th className="text-left py-2 px-2 font-medium">Description</th>
                      <th className="text-left py-2 px-2 font-medium">Reference</th>
                      <th className="text-right py-2 px-2 font-medium">Debit</th>
                      <th className="text-right py-2 px-2 font-medium">Credit</th>
                      <th className="text-right py-2 px-2 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData.transactions.map((entry, index) => (
                      <tr key={entry.id || index} className="border-b last:border-0">
                        <td className="py-2 px-2">{entry.date}</td>
                        <td className="py-2 px-2">{entry.description}</td>
                        <td className="py-2 px-2">
                          {entry.reference ? (
                            <Badge variant="secondary" className="text-xs">{entry.reference}</Badge>
                          ) : "-"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {entry.debit > 0 ? entry.debit.toFixed(3) : "-"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {entry.credit > 0 ? entry.credit.toFixed(3) : "-"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium">
                          {entry.balance.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Statement generated on {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
