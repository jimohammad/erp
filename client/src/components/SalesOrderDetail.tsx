import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, Smartphone } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { SalesOrderWithDetails } from "@shared/schema";

interface SalesOrderDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SalesOrderWithDetails | null;
}

export function SalesOrderDetail({
  open,
  onOpenChange,
  order,
}: SalesOrderDetailProps) {
  if (!order) return null;

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

  const handlePrint = () => {
    const printContent = document.getElementById("sales-invoice-print-content");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Invoice - ${order.invoiceNumber || order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-item { }
            .info-label { font-size: 12px; color: #666; margin-bottom: 2px; }
            .info-value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            .total-row { background: #f9f9f9; }
            .total-label { font-weight: 600; }
            .imei-list { font-size: 11px; color: #666; margin-top: 5px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SALES INVOICE</h1>
            <p>Iqbal Electronics Co. WLL</p>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Invoice Number</div>
              <div class="info-value">${order.invoiceNumber || "—"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Sale Date</div>
              <div class="info-value">${formatDate(order.saleDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Customer</div>
              <div class="info-value">${order.customer?.name || "—"}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Price (KWD)</th>
                <th>Total (KWD)</th>
              </tr>
            </thead>
            <tbody>
              ${order.lineItems.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    ${item.itemName}
                    ${item.imeiNumbers && item.imeiNumbers.length > 0 
                      ? `<div class="imei-list">IMEI: ${item.imeiNumbers.join(", ")}</div>` 
                      : ""}
                  </td>
                  <td>${item.quantity}</td>
                  <td>${formatNumber(item.priceKwd, 3)}</td>
                  <td>${formatNumber(item.totalKwd, 3)}</td>
                </tr>
              `).join("")}
              <tr class="total-row">
                <td colspan="4" class="total-label">Total</td>
                <td><strong>${formatNumber(order.totalKwd, 3)} KWD</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Thank you for your business!
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleWhatsAppShare = () => {
    const lineItemsText = order.lineItems.map((item, index) => {
      let text = `${index + 1}. ${item.itemName} - Qty: ${item.quantity} - ${formatNumber(item.totalKwd, 3)} KWD`;
      if (item.imeiNumbers && item.imeiNumbers.length > 0) {
        text += `\n   IMEI: ${item.imeiNumbers.join(", ")}`;
      }
      return text;
    }).join("\n");

    const message = `*SALES INVOICE*
Iqbal Electronics Co. WLL

Invoice No: ${order.invoiceNumber || "—"}
Date: ${formatDate(order.saleDate)}
Customer: ${order.customer?.name || "—"}

*Items:*
${lineItemsText}

*Total: ${formatNumber(order.totalKwd, 3)} KWD*

Thank you for your business!`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <DialogTitle data-testid="dialog-title-so-detail">Sales Invoice Details</DialogTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              data-testid="button-print-invoice"
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="text-green-600 hover:text-green-700"
              data-testid="button-whatsapp-share"
            >
              <SiWhatsapp className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sale Date</p>
              <p className="font-medium" data-testid="text-so-date">{formatDate(order.saleDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Invoice Number</p>
              <p className="font-medium font-mono" data-testid="text-so-invoice">
                {order.invoiceNumber || "—"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Customer</p>
            <p className="font-medium" data-testid="text-so-customer">
              {order.customer?.name || "—"}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Line Items</p>
            {order.lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items</p>
            ) : (
              <div className="space-y-3">
                {order.lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-md bg-muted/50"
                    data-testid={`item-row-${index}`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × {formatNumber(item.priceKwd, 3)} KWD
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <p>{formatNumber(item.totalKwd, 3)} KWD</p>
                      </div>
                    </div>
                    {item.imeiNumbers && item.imeiNumbers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Smartphone className="h-3 w-3" />
                          <span>IMEI Numbers ({item.imeiNumbers.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.imeiNumbers.map((imei, imeiIndex) => (
                            <Badge 
                              key={imeiIndex} 
                              variant="secondary" 
                              className="text-xs font-mono"
                              data-testid={`imei-badge-${index}-${imeiIndex}`}
                            >
                              {imei}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="p-3 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Total (KWD)</p>
            <p className="text-lg font-semibold font-mono" data-testid="text-so-total-kwd">
              {formatNumber(order.totalKwd, 3)}
            </p>
          </div>

          {order.deliveryDate && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
              <p className="font-medium" data-testid="text-so-delivery">{formatDate(order.deliveryDate)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
