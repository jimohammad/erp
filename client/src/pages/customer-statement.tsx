import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import companyLogoUrl from "@/assets/company-logo.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Link2, Copy, Share2, Printer, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";

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

export default function CustomerStatementPage() {
  const [customerId, setCustomerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetch(companyLogoUrl)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(console.error);
  }, []);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const buildQueryUrl = () => {
    if (!customerId || customerId === "all") return null;
    const params = new URLSearchParams();
    params.append("customerId", customerId);
    if (dateFrom) params.append("startDate", dateFrom);
    if (dateTo) params.append("endDate", dateTo);
    return `/api/customer-statement?${params.toString()}`;
  };

  const queryUrl = buildQueryUrl();

  const { data: statementData, isLoading } = useQuery<{ customer: Customer; entries: StatementEntry[]; openingBalance: number; closingBalance: number }>({
    queryKey: [queryUrl],
    enabled: searchTriggered && !!queryUrl,
  });

  const handleSearch = () => {
    if (!customerId || customerId === "all") {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }
    setSearchTriggered(true);
  };

  const handleClear = () => {
    setCustomerId("");
    setDateFrom("");
    setDateTo("");
    setSearchTriggered(false);
  };

  const generateShareLink = () => {
    if (!customerId || customerId === "all") return "";
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    params.append("customerId", customerId);
    if (dateFrom) params.append("startDate", dateFrom);
    if (dateTo) params.append("endDate", dateTo);
    return `${baseUrl}/statement/${customerId}?${params.toString()}`;
  };

  const handleCopyLink = () => {
    const link = generateShareLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const link = generateShareLink();
    const customerName = customers.find(c => c.id.toString() === customerId)?.name || "Customer";
    const message = `Dear ${customerName},\n\nPlease find your account statement here:\n${link}\n\nRegards,\nIqbal Electronics Co. WLL`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handlePrint = () => {
    if (!statementData) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
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

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Customer Statement - ${statementData.customer.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .company { font-size: 24px; font-weight: bold; }
            .title { font-size: 18px; margin-top: 10px; }
            .customer-info { margin: 20px 0; padding: 15px; border: 1px solid #000; border-radius: 5px; }
            .date-range { font-size: 12px; color: #333; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
            th { font-weight: bold; }
            .amount { text-align: right; }
            .summary { margin-top: 20px; text-align: right; }
            .summary-row { margin: 5px 0; }
            .balance { font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" style="height: 60px; width: auto; margin-bottom: 10px;" alt="IEC" />` : `<div class="company">Iqbal Electronics Co. WLL</div>`}
            <div class="title">Customer Statement</div>
            <div class="date-range">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="customer-info">
            <strong>Customer:</strong> ${statementData.customer.name}<br/>
            ${statementData.customer.phone ? `<strong>Phone:</strong> ${statementData.customer.phone}<br/>` : ""}
            ${dateFrom || dateTo ? `<strong>Period:</strong> ${dateFrom || "Start"} to ${dateTo || "Present"}` : ""}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th class="amount">Debit (KWD)</th>
                <th class="amount">Credit (KWD)</th>
                <th class="amount">Balance (KWD)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="summary">
            <div class="summary-row">Opening Balance: ${statementData.openingBalance.toFixed(3)} KWD</div>
            <div class="summary-row balance">Closing Balance: ${statementData.closingBalance.toFixed(3)} KWD</div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
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
          <title>Statement - ${statementData.customer.name} - ${new Date().toISOString().split("T")[0]}</title>
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
            ${logoBase64 ? `<img src="${logoBase64}" style="height: 60px; width: auto; margin-bottom: 10px;" alt="IEC" />` : `<div class="company">Iqbal Electronics Co. WLL</div>`}
            <div class="title">Customer Statement</div>
          </div>
          <div class="customer-info">
            <strong>Customer:</strong> ${statementData.customer.name}<br/>
            ${statementData.customer.phone ? `<strong>Phone:</strong> ${statementData.customer.phone}<br/>` : ""}
            ${dateFrom || dateTo ? `<strong>Period:</strong> ${dateFrom || "Start"} to ${dateTo || "Present"}` : ""}
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

  const selectedCustomer = customers.find(c => c.id.toString() === customerId);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Customer Statement</h1>
        </div>
        <Badge variant="secondary">Share Statement Links</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-testid="select-customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full" data-testid="button-generate">
                Generate Statement
              </Button>
            </div>
          </div>

          {customerId && customerId !== "all" && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="h-4 w-4" />
                  <span className="font-medium">Shareable Link</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Input
                    value={generateShareLink()}
                    readOnly
                    className="flex-1 min-w-[200px] text-sm"
                    data-testid="input-share-link"
                  />
                  <Button variant="outline" onClick={handleCopyLink} data-testid="button-copy-link">
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="outline" onClick={handleShareWhatsApp} data-testid="button-whatsapp">
                    <Share2 className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleClear} data-testid="button-clear">
              Clear
            </Button>
            {statementData && statementData.entries.length > 0 && (
              <>
                <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handlePrint} data-testid="button-print">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {searchTriggered && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Statement for {selectedCustomer?.name || "Customer"}</span>
              {statementData && (
                <Badge variant="secondary">{statementData.entries.length} transactions</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !statementData || statementData.entries.length === 0 ? (
              <p className="text-muted-foreground">No transactions found for this customer.</p>
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
                        <tr key={`${entry.id}-${index}`} className="border-b" data-testid={`row-statement-${index}`}>
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
                <div className="mt-4 text-right space-y-1">
                  <p className="text-muted-foreground">Opening Balance: {statementData.openingBalance.toFixed(3)} KWD</p>
                  <p className="font-bold text-lg">Closing Balance: {statementData.closingBalance.toFixed(3)} KWD</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
