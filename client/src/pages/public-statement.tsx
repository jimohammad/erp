import { useQuery } from "@tanstack/react-query";
import { useParams, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText, Building2 } from "lucide-react";

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
  customer: { name: string; phone?: string };
  entries: StatementEntry[];
  openingBalance: number;
  closingBalance: number;
}

export default function PublicStatementPage() {
  const params = useParams();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const customerId = params.customerId;
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const buildQueryUrl = () => {
    if (!customerId) return null;
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const queryStr = params.toString();
    return queryStr ? `/api/public/customer-statement/${customerId}?${queryStr}` : `/api/public/customer-statement/${customerId}`;
  };

  const queryUrl = buildQueryUrl();

  const { data: statementData, isLoading, error } = useQuery<StatementData>({
    queryKey: [queryUrl],
    enabled: !!queryUrl,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!statementData) return;
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      const rows = statementData.entries.map(e => 
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
          <title>Statement - ${statementData.customer.name}</title>
          <style>
            @media print { @page { margin: 1cm; } }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .company { font-size: 24px; font-weight: bold; }
            .title { font-size: 18px; margin-top: 10px; }
            .customer-info { margin: 20px 0; padding: 15px; border: 1px solid #000; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
            th { font-weight: bold; }
            .amount { text-align: right; }
            .summary { margin-top: 20px; text-align: right; }
            .balance { font-weight: bold; font-size: 16px; }
            .instructions { margin-top: 20px; padding: 15px; border: 1px dashed #000; text-align: center; }
            @media print { .instructions { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">Iqbal Electronics Co. WLL</div>
            <div class="title">Account Statement</div>
          </div>
          <div class="customer-info">
            <strong>Customer:</strong> ${statementData.customer.name}<br/>
            ${statementData.customer.phone ? `<strong>Phone:</strong> ${statementData.customer.phone}<br/>` : ""}
            ${startDate || endDate ? `<strong>Period:</strong> ${startDate || "Start"} to ${endDate || "Present"}` : ""}
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
            <div>Opening Balance: ${statementData.openingBalance.toFixed(3)} KWD</div>
            <div class="balance">Closing Balance: ${statementData.closingBalance.toFixed(3)} KWD</div>
          </div>
          <div class="instructions">
            <p><strong>To save as PDF:</strong> Press Ctrl+P (or Cmd+P), then select "Save as PDF"</p>
          </div>
        </body>
        </html>
      `);
      pdfWindow.document.close();
    }
  };

  if (!customerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Invalid statement link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Loading statement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !statementData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Failed to load statement. Please contact the business.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Iqbal Electronics Co. WLL</CardTitle>
            <p className="text-muted-foreground">Account Statement</p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-lg">{statementData.customer.name}</p>
                {statementData.customer.phone && (
                  <p className="text-sm text-muted-foreground">{statementData.customer.phone}</p>
                )}
                {(startDate || endDate) && (
                  <p className="text-sm text-muted-foreground">
                    Period: {startDate || "Start"} to {endDate || "Present"}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 no-print">
                <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handlePrint} data-testid="button-print">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>

            {statementData.entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions found.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-left py-2 px-3">Description</th>
                        <th className="text-left py-2 px-3">Reference</th>
                        <th className="text-right py-2 px-3">Debit (KWD)</th>
                        <th className="text-right py-2 px-3">Credit (KWD)</th>
                        <th className="text-right py-2 px-3">Balance (KWD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.entries.map((entry, index) => (
                        <tr key={`${entry.id}-${index}`} className="border-b">
                          <td className="py-2 px-3">{entry.date}</td>
                          <td className="py-2 px-3">{entry.description}</td>
                          <td className="py-2 px-3">{entry.reference || "-"}</td>
                          <td className="py-2 px-3 text-right">{entry.debit > 0 ? entry.debit.toFixed(3) : "-"}</td>
                          <td className="py-2 px-3 text-right">{entry.credit > 0 ? entry.credit.toFixed(3) : "-"}</td>
                          <td className="py-2 px-3 text-right font-medium">{entry.balance.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 text-right space-y-1 p-4 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Opening Balance: {statementData.openingBalance.toFixed(3)} KWD</p>
                  <p className="font-bold text-xl">Closing Balance: {statementData.closingBalance.toFixed(3)} KWD</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          This statement was generated by Iqbal Electronics Co. WLL
        </p>
      </div>
    </div>
  );
}
