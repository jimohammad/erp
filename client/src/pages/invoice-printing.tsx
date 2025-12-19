import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Printer } from "lucide-react";
import type { SalesOrderWithDetails } from "@shared/schema";

export default function InvoicePrinting() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: invoicesData, isLoading } = useQuery<SalesOrderWithDetails[]>({
    queryKey: [`/api/sales-orders?date=${selectedDate}`],
    enabled: !!selectedDate,
  });

  const invoices = invoicesData || [];

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toFixed(3);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const generateMergedPDF = async () => {
    if (selectedInvoices.size === 0) {
      toast({
        title: "No invoices selected",
        description: "Please select at least one invoice to download",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const invoiceIds = Array.from(selectedInvoices);
      
      const response = await fetch("/api/reports/merged-invoices-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          invoiceIds, 
          date: selectedDate 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoices_${selectedDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF downloaded",
        description: `Downloaded ${selectedInvoices.size} invoice(s) as PDF`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-5 w-5" />
            Invoice Printing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="invoice-date">Select Date</Label>
              <Input
                id="invoice-date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedInvoices(new Set());
                }}
                className="w-[180px]"
                data-testid="input-invoice-date"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {invoices.length} invoices found
              </Badge>
              {selectedInvoices.size > 0 && (
                <Badge variant="default" className="font-mono">
                  {selectedInvoices.size} selected
                </Badge>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales invoices found for {selectedDate ? formatDate(selectedDate) : "selected date"}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedInvoices(new Set(invoices.map(inv => inv.id)));
                            } else {
                              setSelectedInvoices(new Set());
                            }
                          }}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount (KWD)</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoices.has(invoice.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedInvoices);
                              if (checked) {
                                newSet.add(invoice.id);
                              } else {
                                newSet.delete(invoice.id);
                              }
                              setSelectedInvoices(newSet);
                            }}
                            data-testid={`checkbox-invoice-${invoice.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {invoice.invoiceNumber || `INV-${invoice.id}`}
                        </TableCell>
                        <TableCell>{invoice.customer?.name || "Walk-in"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(invoice.totalKwd || "0")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{invoice.lineItems?.length || 0}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total: {formatAmount(invoices.reduce((sum, inv) => sum + parseFloat(inv.totalKwd || "0"), 0))} KWD
                </div>
                <Button
                  onClick={generateMergedPDF}
                  disabled={isGenerating || selectedInvoices.size === 0}
                  data-testid="button-download-pdf"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF ({selectedInvoices.size})
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
