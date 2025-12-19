import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Loader2, FileText, List, Building2 } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";
import { generateQRCodeDataURL, getQRCodeHtml } from "@/lib/qrcode";

type Transaction = {
  id: number;
  type: string;
  documentNumber: string;
  date: string;
  partyName: string;
  amount: number;
  fxCurrency?: string;
  fxAmount?: number;
  fxRate?: number;
  paymentMethod?: string;
  notes?: string;
};

type TransactionsResponse = {
  data: Transaction[];
  total: number;
};

type CompanySettings = {
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  crNumber?: string;
};

export default function BankDocumentsPage() {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [documentType, setDocumentType] = useState<string>("sales");
  const [isPrinting, setIsPrinting] = useState(false);
  const { currentBranchId } = useBranch();

  const moduleFilter = documentType === "sales" ? "sales" : "payment_in";

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("limit", "1000");
    params.set("offset", "0");
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("modules", moduleFilter);
    if (currentBranchId) params.set("branchId", currentBranchId.toString());
    return params.toString();
  };

  const { data: transactionsData, isLoading } = useQuery<TransactionsResponse>({
    queryKey: [`/api/transactions?${buildQueryString()}`],
    enabled: !!startDate && !!endDate,
  });

  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  const transactions = transactionsData?.data || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const getDocumentTitle = () => {
    return documentType === "sales" ? "Sales Invoices" : "Payment Receipts";
  };

  const printBatchSummary = () => {
    const companyName = companySettings?.companyName || "IQBAL ELECTRONICS CO. WLL";
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${getDocumentTitle()} - Bank Copy</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #000; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #000; }
          .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .company-details { font-size: 10px; color: #333; }
          .report-title { font-size: 16px; font-weight: bold; margin: 15px 0 5px; }
          .date-range { font-size: 11px; color: #555; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; font-size: 10px; }
          td { font-size: 10px; }
          .amount { text-align: right; font-family: monospace; }
          .total-row { font-weight: bold; background-color: #f5f5f5; }
          .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #666; }
          .page-number { position: fixed; bottom: 10mm; right: 15mm; font-size: 9px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${companyName}</div>
          ${companySettings?.address ? `<div class="company-details">${companySettings.address}</div>` : ''}
          ${companySettings?.phone ? `<div class="company-details">Tel: ${companySettings.phone}</div>` : ''}
          ${companySettings?.crNumber ? `<div class="company-details">CR: ${companySettings.crNumber}</div>` : ''}
        </div>
        
        <div class="report-title">${getDocumentTitle()} Summary</div>
        <div class="date-range">Period: ${formatDate(startDate)} to ${formatDate(endDate)}</div>
        <div class="date-range">Total Documents: ${transactions.length} | Total Amount: KWD ${formatAmount(totalAmount)}</div>
        
        <table>
          <thead>
            <tr>
              <th style="width:5%">#</th>
              <th style="width:15%">Document No.</th>
              <th style="width:12%">Date</th>
              <th style="width:30%">${documentType === "sales" ? "Customer" : "Party"}</th>
              ${documentType === "payment-in" ? '<th style="width:13%">Method</th>' : ''}
              <th style="width:${documentType === "sales" ? "20%" : "12%"}">Amount (KWD)</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map((t, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${t.documentNumber}</td>
                <td>${formatDate(t.date)}</td>
                <td>${t.partyName || '-'}</td>
                ${documentType === "payment-in" ? `<td>${t.paymentMethod || '-'}</td>` : ''}
                <td class="amount">${formatAmount(t.amount)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="${documentType === "sales" ? 4 : 5}">TOTAL</td>
              <td class="amount">${formatAmount(totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>This is a computer generated document. No signature required.</p>
          <p>Printed on: ${new Date().toLocaleString('en-GB')}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const printIndividualDocuments = async () => {
    if (transactions.length === 0) return;
    
    setIsPrinting(true);
    const companyName = companySettings?.companyName || "IQBAL ELECTRONICS CO. WLL";
    
    // Generate QR codes for each document
    const qrCodes: string[] = [];
    for (const t of transactions) {
      const qrData = {
        type: documentType === "sales" ? "SALE" as const : "PAYMENT_IN" as const,
        id: t.id,
        number: t.documentNumber,
        amount: t.amount.toFixed(3),
        date: t.date,
        partyName: t.partyName,
        partyType: "customer" as const,
      };
      const qrDataUrl = await generateQRCodeDataURL(qrData);
      qrCodes.push(qrDataUrl);
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${getDocumentTitle()} - Individual Copies</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #000; }
          .document { page-break-after: always; padding: 20px 0; }
          .document:last-child { page-break-after: avoid; }
          .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #000; }
          .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .company-details { font-size: 10px; color: #333; }
          .doc-title { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0; padding: 8px; background: #f0f0f0; border: 1px solid #000; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .info-box { border: 1px solid #000; padding: 12px; }
          .info-label { font-size: 10px; color: #555; margin-bottom: 3px; }
          .info-value { font-size: 13px; font-weight: bold; }
          .amount-box { text-align: center; border: 2px solid #000; padding: 20px; margin: 25px 0; background: #f9f9f9; }
          .amount-label { font-size: 12px; margin-bottom: 5px; }
          .amount-value { font-size: 28px; font-weight: bold; }
          .amount-words { font-size: 11px; margin-top: 8px; font-style: italic; }
          .qr-section { text-align: center; margin-top: 30px; }
          .qr-code { width: 80px; height: 80px; }
          .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 15px; }
          .notes { margin-top: 15px; padding: 10px; border: 1px solid #ccc; background: #fafafa; font-size: 11px; }
          .notes-label { font-weight: bold; margin-bottom: 5px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        ${transactions.map((t, index) => `
          <div class="document">
            <div class="header">
              <div class="company-name">${companyName}</div>
              ${companySettings?.address ? `<div class="company-details">${companySettings.address}</div>` : ''}
              ${companySettings?.phone ? `<div class="company-details">Tel: ${companySettings.phone}</div>` : ''}
              ${companySettings?.crNumber ? `<div class="company-details">CR: ${companySettings.crNumber}</div>` : ''}
            </div>
            
            <div class="doc-title">${documentType === "sales" ? "SALES INVOICE" : "PAYMENT RECEIPT"} - BANK COPY</div>
            
            <div class="info-grid">
              <div class="info-box">
                <div class="info-label">Document Number</div>
                <div class="info-value">${t.documentNumber}</div>
              </div>
              <div class="info-box">
                <div class="info-label">Date</div>
                <div class="info-value">${formatDate(t.date)}</div>
              </div>
              <div class="info-box">
                <div class="info-label">${documentType === "sales" ? "Customer" : "Received From"}</div>
                <div class="info-value">${t.partyName || '-'}</div>
              </div>
              ${documentType === "payment-in" ? `
                <div class="info-box">
                  <div class="info-label">Payment Method</div>
                  <div class="info-value">${t.paymentMethod || '-'}</div>
                </div>
              ` : `
                <div class="info-box">
                  <div class="info-label">Reference</div>
                  <div class="info-value">${t.documentNumber}</div>
                </div>
              `}
            </div>
            
            <div class="amount-box">
              <div class="amount-label">Amount</div>
              <div class="amount-value">KWD ${formatAmount(t.amount)}</div>
              ${t.fxCurrency && t.fxAmount ? `
                <div class="amount-words">(${t.fxCurrency} ${formatAmount(t.fxAmount)} @ ${t.fxRate})</div>
              ` : ''}
            </div>
            
            ${t.notes ? `
              <div class="notes">
                <div class="notes-label">Notes:</div>
                <div>${t.notes}</div>
              </div>
            ` : ''}
            
            <div class="qr-section">
              ${qrCodes[index] ? `<img src="${qrCodes[index]}" alt="QR Code" class="qr-code" />` : ''}
              <div style="font-size:8px;margin-top:5px;">Scan to verify document</div>
            </div>
            
            <div class="footer">
              <p>This is a computer generated document. No signature required.</p>
              <p>Document ${index + 1} of ${transactions.length} | Printed on: ${new Date().toLocaleString('en-GB')}</p>
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    setIsPrinting(false);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Bank Documents</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate A4 Documents for Bank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="documentType" data-testid="select-document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Invoices</SelectItem>
                  <SelectItem value="payment-in">Payment Receipts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">To Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div className="flex items-end gap-2">
              <Badge variant="secondary" className="h-9 px-3">
                {transactions.length} documents
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button 
              onClick={printBatchSummary} 
              disabled={transactions.length === 0 || isLoading}
              data-testid="button-print-summary"
            >
              <List className="h-4 w-4 mr-2" />
              Print Summary (Table)
            </Button>
            <Button 
              onClick={printIndividualDocuments} 
              disabled={transactions.length === 0 || isLoading || isPrinting}
              variant="outline"
              data-testid="button-print-individual"
            >
              {isPrinting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Print Individual A4s
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Preview: {getDocumentTitle()}</CardTitle>
          <Badge variant="outline">
            Total: KWD {formatAmount(totalAmount)}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents found for the selected period
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Document No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>{documentType === "sales" ? "Customer" : "Party"}</TableHead>
                    {documentType === "payment-in" && <TableHead>Method</TableHead>}
                    <TableHead className="text-right">Amount (KWD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 50).map((t, index) => (
                    <TableRow key={t.id} data-testid={`row-document-${t.id}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{t.documentNumber}</TableCell>
                      <TableCell>{formatDate(t.date)}</TableCell>
                      <TableCell>{t.partyName || '-'}</TableCell>
                      {documentType === "payment-in" && <TableCell>{t.paymentMethod || '-'}</TableCell>}
                      <TableCell className="text-right font-mono">{formatAmount(t.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {transactions.length > 50 && (
                    <TableRow>
                      <TableCell colSpan={documentType === "sales" ? 5 : 6} className="text-center text-muted-foreground">
                        ... and {transactions.length - 50} more documents
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
