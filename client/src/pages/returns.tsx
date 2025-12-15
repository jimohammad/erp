import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, RotateCcw, X, Smartphone, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ReturnWithDetails, Customer, Supplier, Item } from "@shared/schema";

const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const returnFormSchema = z.object({
  returnDate: z.string().min(1, "Date is required"),
  returnNumber: z.string().min(1, "Return number is required"),
  returnType: z.enum(["purchase_return", "sale_return"]),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
}).refine(
  (data) => {
    if (data.returnType === "sale_return") {
      return data.customerId && data.customerId.length > 0;
    }
    return true;
  },
  { message: "Customer is required for sale returns", path: ["customerId"] }
).refine(
  (data) => {
    if (data.returnType === "purchase_return") {
      return data.supplierId && data.supplierId.length > 0;
    }
    return true;
  },
  { message: "Supplier is required for purchase returns", path: ["supplierId"] }
);

type ReturnFormValues = z.infer<typeof returnFormSchema>;

interface ReturnLineItemForm {
  itemName: string;
  quantity: number;
  priceKwd: string;
  totalKwd: string;
  imeiNumbers: string[];
}

export default function ReturnsPage() {
  const { toast } = useToast();
  const [returnType, setReturnType] = useState<"sale_return" | "purchase_return">("sale_return");
  const [lineItems, setLineItems] = useState<ReturnLineItemForm[]>([
    { itemName: "", quantity: 0, priceKwd: "", totalKwd: "", imeiNumbers: [] },
  ]);
  const [imeiDialogOpen, setImeiDialogOpen] = useState(false);
  const [imeiDialogLineIndex, setImeiDialogLineIndex] = useState<number | null>(null);
  const [newImei, setNewImei] = useState("");
  const [imeiError, setImeiError] = useState("");

  const { data: returns = [], isLoading } = useQuery<ReturnWithDetails[]>({
    queryKey: ["/api/returns"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const generateReturnNumber = (): string => {
    const existingNumbers = returns
      .map(r => r.returnNumber)
      .filter(n => n && n.startsWith("Ret-"))
      .map(n => parseInt(n!.replace("Ret-", "")))
      .filter(n => !isNaN(n));
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 10000;
    return `Ret-${maxNumber + 1}`;
  };

  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      returnDate: format(new Date(), "yyyy-MM-dd"),
      returnNumber: "",
      returnType: "sale_return",
      customerId: "",
      supplierId: "",
    },
  });

  // Initialize form with return number on mount
  useEffect(() => {
    if (returns.length >= 0) {
      const newReturnNumber = generateReturnNumber();
      form.setValue("returnNumber", newReturnNumber);
    }
  }, [returns]);

  const createReturnMutation = useMutation({
    mutationFn: async (data: ReturnFormValues) => {
      const validLineItems = lineItems.filter(item => item.itemName);
      if (validLineItems.length === 0) {
        throw new Error("At least one line item is required");
      }
      const payload = {
        returnDate: data.returnDate,
        returnNumber: data.returnNumber,
        returnType: data.returnType,
        customerId: data.returnType === "sale_return" && data.customerId ? parseInt(data.customerId) : null,
        supplierId: data.returnType === "purchase_return" && data.supplierId ? parseInt(data.supplierId) : null,
        lineItems: validLineItems.map(item => ({
          itemName: item.itemName,
          quantity: item.quantity,
          priceKwd: item.priceKwd,
          totalKwd: item.totalKwd,
          imeiNumbers: item.imeiNumbers,
        })),
      };
      return apiRequest("POST", "/api/returns", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      const newReturnNumber = generateReturnNumber();
      form.reset({
        returnDate: format(new Date(), "yyyy-MM-dd"),
        returnNumber: newReturnNumber,
        returnType: returnType,
        customerId: "",
        supplierId: "",
      });
      setLineItems([{ itemName: "", quantity: 0, priceKwd: "", totalKwd: "", imeiNumbers: [] }]);
      toast({ title: "Return recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create return", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/returns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      toast({ title: "Return deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete return", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const handleReset = () => {
    const newReturnNumber = generateReturnNumber();
    form.setValue("returnNumber", newReturnNumber);
    form.setValue("returnType", returnType);
    form.setValue("returnDate", format(new Date(), "yyyy-MM-dd"));
    form.setValue("customerId", "");
    form.setValue("supplierId", "");
    setLineItems([{ itemName: "", quantity: 0, priceKwd: "", totalKwd: "", imeiNumbers: [] }]);
  };

  const handleTypeToggle = (checked: boolean) => {
    const newType = checked ? "purchase_return" : "sale_return";
    setReturnType(newType);
    form.setValue("returnType", newType);
    form.setValue("customerId", "");
    form.setValue("supplierId", "");
  };

  const updateLineItem = (index: number, field: keyof ReturnLineItemForm, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "quantity" || field === "priceKwd") {
      const qty = field === "quantity" ? value : updated[index].quantity;
      const price = field === "priceKwd" ? value : updated[index].priceKwd;
      const total = (parseFloat(price) || 0) * (parseInt(qty) || 0);
      updated[index].totalKwd = total.toFixed(3);
    }
    
    if (field === "itemName" && value) {
      const selectedItem = items.find(i => i.name === value);
      if (selectedItem && selectedItem.sellingPriceKwd) {
        updated[index].priceKwd = selectedItem.sellingPriceKwd;
        const total = (parseFloat(selectedItem.sellingPriceKwd) || 0) * (updated[index].quantity || 0);
        updated[index].totalKwd = total.toFixed(3);
      }
    }
    
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { itemName: "", quantity: 0, priceKwd: "", totalKwd: "", imeiNumbers: [] }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const openImeiDialog = (index: number) => {
    setImeiDialogLineIndex(index);
    setNewImei("");
    setImeiError("");
    setImeiDialogOpen(true);
  };

  const closeImeiDialog = () => {
    setImeiDialogOpen(false);
    setImeiDialogLineIndex(null);
    setNewImei("");
    setImeiError("");
  };

  const getAllImeiNumbers = (): string[] => {
    return lineItems.flatMap(item => item.imeiNumbers);
  };

  const validateImei = (imei: string): string | null => {
    const trimmed = imei.trim();
    if (!/^\d+$/.test(trimmed)) {
      return "IMEI must contain only digits";
    }
    if (trimmed.length !== 15) {
      return "IMEI must be exactly 15 digits";
    }
    if (getAllImeiNumbers().includes(trimmed)) {
      return "This IMEI has already been added";
    }
    return null;
  };

  const handleAddImei = () => {
    if (imeiDialogLineIndex === null) return;
    const trimmed = newImei.trim();
    if (!trimmed) return;

    const error = validateImei(trimmed);
    if (error) {
      setImeiError(error);
      return;
    }

    const updated = [...lineItems];
    updated[imeiDialogLineIndex].imeiNumbers = [...updated[imeiDialogLineIndex].imeiNumbers, trimmed];
    updated[imeiDialogLineIndex].quantity = updated[imeiDialogLineIndex].imeiNumbers.length;
    const total = (parseFloat(updated[imeiDialogLineIndex].priceKwd) || 0) * updated[imeiDialogLineIndex].quantity;
    updated[imeiDialogLineIndex].totalKwd = total.toFixed(3);
    setLineItems(updated);
    setNewImei("");
    setImeiError("");
  };

  const handleRemoveImei = (imeiIndex: number) => {
    if (imeiDialogLineIndex === null) return;
    const updated = [...lineItems];
    updated[imeiDialogLineIndex].imeiNumbers = updated[imeiDialogLineIndex].imeiNumbers.filter((_, i) => i !== imeiIndex);
    updated[imeiDialogLineIndex].quantity = Math.max(1, updated[imeiDialogLineIndex].imeiNumbers.length);
    const total = (parseFloat(updated[imeiDialogLineIndex].priceKwd) || 0) * updated[imeiDialogLineIndex].quantity;
    updated[imeiDialogLineIndex].totalKwd = total.toFixed(3);
    setLineItems(updated);
  };

  const handleImeiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddImei();
    }
  };

  const onSubmit = (data: ReturnFormValues) => {
    createReturnMutation.mutate(data);
  };

  const handlePrintReturn = (ret: ReturnWithDetails) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const partyName = ret.returnType === "sale_return" 
      ? ret.customer?.name || "Not specified"
      : ret.supplier?.name || "Not specified";
    const partyLabel = ret.returnType === "sale_return" ? "Customer" : "Supplier";
    const returnTypeLabel = ret.returnType === "sale_return" ? "SALE RETURN" : "PURCHASE RETURN";

    const grandTotal = ret.lineItems?.reduce((sum, item) => sum + (parseFloat(item.totalKwd || "0")), 0) || 0;

    const lineItemsHtml = ret.lineItems?.map(item => `
      <div class="item-row">
        <div class="item-name">${escapeHtml(item.itemName)}</div>
        <div class="item-details">${item.quantity} x ${parseFloat(item.priceKwd || "0").toFixed(3)} = ${parseFloat(item.totalKwd || "0").toFixed(3)}</div>
        ${item.imeiNumbers?.length ? `<div class="item-imei">IMEI: ${item.imeiNumbers.map(imei => escapeHtml(imei)).join(", ")}</div>` : ""}
      </div>
    `).join("") || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return - ${escapeHtml(ret.returnNumber)}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Courier New', monospace;
              background: #fff;
              color: #000;
              line-height: 1.3;
              font-size: 10pt;
              width: 80mm;
              margin: 0;
              padding: 0;
            }
            
            .receipt {
              width: 80mm;
              padding: 2mm 3mm;
            }
            
            .header {
              text-align: center;
              padding-bottom: 2mm;
              border-bottom: 1px dashed #000;
              margin-bottom: 2mm;
            }
            
            .company-name {
              font-size: 12pt;
              font-weight: bold;
            }
            
            .company-sub {
              font-size: 8pt;
            }
            
            .badge {
              display: inline-block;
              margin-top: 2mm;
              padding: 1mm 3mm;
              font-size: 9pt;
              font-weight: bold;
              border: 1px solid #000;
            }
            
            .info {
              margin-bottom: 2mm;
              font-size: 9pt;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 1mm 0;
            }
            
            .items {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 2mm 0;
              margin: 2mm 0;
            }
            
            .item-row {
              margin-bottom: 2mm;
              font-size: 9pt;
            }
            
            .item-name {
              font-weight: bold;
            }
            
            .item-details {
              text-align: right;
            }
            
            .item-imei {
              font-size: 7pt;
              color: #333;
              word-break: break-all;
            }
            
            .total-box {
              text-align: right;
              padding: 2mm 0;
              font-size: 12pt;
              font-weight: bold;
            }
            
            .footer {
              text-align: center;
              padding-top: 2mm;
              border-top: 1px dashed #000;
              font-size: 8pt;
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="company-name">Iqbal Electronics</div>
              <div class="company-sub">Co. WLL - Kuwait</div>
              <div class="badge">${returnTypeLabel}</div>
            </div>
            
            <div class="info">
              <div class="info-row">
                <span>Return #:</span>
                <span style="font-weight:bold">${escapeHtml(ret.returnNumber)}</span>
              </div>
              <div class="info-row">
                <span>Date:</span>
                <span>${format(new Date(ret.returnDate), "dd/MM/yyyy")}</span>
              </div>
              <div class="info-row">
                <span>${partyLabel}:</span>
                <span>${escapeHtml(partyName)}</span>
              </div>
            </div>
            
            <div class="items">
              ${lineItemsHtml}
            </div>
            
            <div class="total-box">
              TOTAL: ${grandTotal.toFixed(3)} KWD
            </div>
            
            <div class="footer">
              Thank You!<br/>
              Computer Generated Receipt
            </div>
          </div>
          
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = (ret: ReturnWithDetails) => {
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) return;

    const partyName = ret.returnType === "sale_return" 
      ? ret.customer?.name || "Not specified"
      : ret.supplier?.name || "Not specified";
    const partyLabel = ret.returnType === "sale_return" ? "Customer" : "Supplier";
    const returnTypeLabel = ret.returnType === "sale_return" ? "Sale Return" : "Purchase Return";

    const grandTotal = ret.lineItems?.reduce((sum, item) => sum + (parseFloat(item.totalKwd || "0")), 0) || 0;

    const lineItemsHtml = ret.lineItems?.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.itemName)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${parseFloat(item.priceKwd || "0").toFixed(3)} KWD</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${parseFloat(item.totalKwd || "0").toFixed(3)} KWD</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">${item.imeiNumbers?.length ? item.imeiNumbers.map(imei => escapeHtml(imei)).join(", ") : "-"}</td>
      </tr>
    `).join("") || "";

    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return - ${escapeHtml(ret.returnNumber)}</title>
          <style>
            body { font-family: Inter, system-ui, sans-serif; padding: 20px; }
            .pdf-instructions { text-align: center; padding: 16px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; margin-bottom: 20px; }
            .pdf-instructions strong { display: block; font-size: 16px; margin-bottom: 8px; color: #92400e; }
            .pdf-instructions span { color: #92400e; }
            .shortcut { display: inline-block; background: #fff; border: 1px solid #d97706; padding: 4px 12px; border-radius: 4px; font-family: monospace; font-weight: 600; margin: 4px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .company { font-size: 24px; font-weight: bold; color: #0f172a; }
            .return-title { font-size: 14px; color: #64748b; text-transform: uppercase; }
            .return-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-top: 8px;
              ${ret.returnType === "sale_return" ? "background: #dbeafe; color: #1e40af;" : "background: #fef3c7; color: #92400e;"} }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
            .info-item { font-size: 14px; }
            .info-label { color: #64748b; margin-right: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
            .total { font-size: 18px; font-weight: bold; text-align: right; }
            @media print { .pdf-instructions { display: none !important; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="pdf-instructions">
            <strong>Save Return as PDF</strong>
            <span>Press <span class="shortcut">Ctrl + P</span> (Windows) or <span class="shortcut">Cmd + P</span> (Mac)</span><br/>
            <span>Then select "Save as PDF" as the destination</span>
          </div>
          <div class="header">
            <div>
              <div class="company">Iqbal Electronics</div>
              <div style="color: #64748b; font-size: 12px;">Kuwait</div>
            </div>
            <div style="text-align: right;">
              <div class="return-title">Return Receipt</div>
              <div style="font-size: 18px; font-weight: bold;">${escapeHtml(ret.returnNumber)}</div>
              <div class="return-badge">${returnTypeLabel}</div>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Date:</span> ${format(new Date(ret.returnDate), "dd/MM/yyyy")}</div>
            <div class="info-item"><span class="info-label">${partyLabel}:</span> ${escapeHtml(partyName)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
                <th>IMEI Numbers</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
          </table>
          <div class="total">Grand Total: ${grandTotal.toFixed(3)} KWD</div>
        </body>
      </html>
    `);
    pdfWindow.document.close();
  };

  const filteredReturns = returns.filter(r => r.returnType === returnType);

  const grandTotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.totalKwd) || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
            <CardTitle className="text-base">
              New {returnType === "sale_return" ? "Sale" : "Purchase"} Return
            </CardTitle>
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Sale Return</Label>
              <Switch
                checked={returnType === "purchase_return"}
                onCheckedChange={handleTypeToggle}
                data-testid="switch-return-type"
              />
              <Label className="text-sm font-medium">Purchase Return</Label>
              <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset-return">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {returnType === "sale_return" ? (
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-customer">
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-supplier">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="returnDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-return-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="returnNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-muted" data-testid="input-return-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-sm font-medium">Line Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-line">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[450px]">Item</TableHead>
                          <TableHead className="w-[80px]">Qty</TableHead>
                          <TableHead className="w-[100px]">Price (KWD)</TableHead>
                          <TableHead className="w-[100px]">Total (KWD)</TableHead>
                          <TableHead>IMEI Numbers</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Select
                                value={item.itemName}
                                onValueChange={(value) => updateLineItem(index, "itemName", value)}
                              >
                                <SelectTrigger data-testid={`select-item-${index}`}>
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {items.map((itm) => (
                                    <SelectItem key={itm.id} value={itm.name}>
                                      {itm.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={item.quantity || ""}
                                onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                                disabled={item.imeiNumbers.length > 0}
                                data-testid={`input-qty-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.priceKwd}
                                readOnly
                                className="bg-muted"
                                data-testid={`input-price-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.totalKwd}
                                readOnly
                                className="bg-muted"
                                data-testid={`input-total-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openImeiDialog(index)}
                                data-testid={`button-imei-${index}`}
                              >
                                <Smartphone className="h-4 w-4 mr-1" />
                                {item.imeiNumbers.length > 0 ? `${item.imeiNumbers.length} IMEI` : "Add IMEI"}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                                disabled={lineItems.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="text-sm font-medium">
                      Grand Total: <span className="text-lg">{grandTotal.toFixed(3)} KWD</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={createReturnMutation.isPending} data-testid="button-submit-return">
                    {createReturnMutation.isPending ? "Saving..." : "Save Return"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

      {/* IMEI Popup Dialog */}
      <Dialog open={imeiDialogOpen} onOpenChange={setImeiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Manage IMEI Numbers
              {imeiDialogLineIndex !== null && lineItems[imeiDialogLineIndex]?.itemName && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {lineItems[imeiDialogLineIndex].itemName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add IMEI Number</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter 15-digit IMEI"
                  value={newImei}
                  onChange={(e) => {
                    setNewImei(e.target.value);
                    setImeiError("");
                  }}
                  onKeyDown={handleImeiKeyDown}
                  maxLength={15}
                  data-testid="input-imei-popup"
                />
                <Button
                  type="button"
                  onClick={handleAddImei}
                  data-testid="button-add-imei-popup"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {imeiError && (
                <p className="text-sm text-destructive">{imeiError}</p>
              )}
            </div>

            {imeiDialogLineIndex !== null && lineItems[imeiDialogLineIndex]?.imeiNumbers.length > 0 && (
              <div className="space-y-2">
                <Label>Added IMEI Numbers ({lineItems[imeiDialogLineIndex].imeiNumbers.length})</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {lineItems[imeiDialogLineIndex].imeiNumbers.map((imei, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-1 rounded bg-muted/50">
                      <span className="text-sm font-mono">{imei}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveImei(idx)}
                        data-testid={`button-remove-imei-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={closeImeiDialog} data-testid="button-close-imei-popup">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {returnType === "sale_return" ? "Sale Returns" : "Purchase Returns"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading returns...</p>
          ) : filteredReturns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {returnType === "sale_return" ? "sale" : "purchase"} returns recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Return No.</TableHead>
                  <TableHead>{returnType === "sale_return" ? "Customer" : "Supplier"}</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((ret) => (
                  <TableRow key={ret.id} data-testid={`row-return-${ret.id}`}>
                    <TableCell>{format(new Date(ret.returnDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{ret.returnNumber}</TableCell>
                    <TableCell>
                      {ret.returnType === "sale_return" 
                        ? ret.customer?.name || "-"
                        : ret.supplier?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {ret.lineItems?.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            {item.itemName} x{item.quantity}
                            {item.imeiNumbers && item.imeiNumbers.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-1">
                                {item.imeiNumbers.map((imei) => (
                                  <Badge key={imei} variant="outline" className="text-xs">
                                    {imei}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintReturn(ret)}
                          title="Print"
                          data-testid={`button-print-return-${ret.id}`}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(ret)}
                          title="Export PDF"
                          data-testid={`button-pdf-return-${ret.id}`}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteReturnMutation.mutate(ret.id)}
                          disabled={deleteReturnMutation.isPending}
                          data-testid={`button-delete-return-${ret.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
