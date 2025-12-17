import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import companyLogoUrl from "@/assets/company-logo.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Save, 
  CreditCard,
  Banknote,
  Search,
  Eye,
  Calendar,
  User,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  Send,
  RotateCcw,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { PaymentWithDetails, Customer, Supplier, PaymentType, PaymentDirection, PurchaseOrderWithDetails } from "@shared/schema";
import { PAYMENT_TYPES, PAYMENT_DIRECTIONS } from "@shared/schema";

const FX_CURRENCIES = ["AED", "USD"] as const;

const PAGE_SIZE = 50;

export default function PaymentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_user";
  
  const [logoBase64, setLogoBase64] = useState<string>("");
  
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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentWithDetails | null>(null);
  const [page, setPage] = useState(1);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [whatsAppPayment, setWhatsAppPayment] = useState<PaymentWithDetails | null>(null);
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };
  
  const handlePaymentTypeFilterChange = (value: string) => {
    setPaymentTypeFilter(value);
    setPage(1);
  };
  
  const handleDirectionFilterChange = (value: string) => {
    setDirectionFilter(value);
    setPage(1);
  };
  
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [direction, setDirection] = useState<PaymentDirection>("IN");
  const [shouldPrintAfterSave, setShouldPrintAfterSave] = useState(false);
  const [printTypeAfterSave, setPrintTypeAfterSave] = useState<"thermal" | "a4">("thermal");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash");
  const [amount, setAmount] = useState("");
  const [fxCurrency, setFxCurrency] = useState<string>("");
  const [fxRate, setFxRate] = useState("");
  const [fxAmount, setFxAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  
  // Split payment support
  const [splitEnabled, setSplitEnabled] = useState(false);
  type PaymentSplitLine = { paymentType: PaymentType; amount: string; fxCurrency?: string; fxRate?: string; fxAmount?: string };
  const [splits, setSplits] = useState<PaymentSplitLine[]>([
    { paymentType: "Cash", amount: "" },
    { paymentType: "Knet", amount: "" }
  ]);
  
  const addSplit = () => {
    setSplits([...splits, { paymentType: "Cash", amount: "" }]);
  };
  
  const removeSplit = (index: number) => {
    if (splits.length > 2) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };
  
  const updateSplit = (index: number, field: keyof PaymentSplitLine, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };
  
  const splitTotal = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ data: PaymentWithDetails[]; total: number }>({
    queryKey: ["/api/payments", page],
    queryFn: async () => {
      const res = await fetch(`/api/payments?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });
  
  const payments = paymentsData?.data ?? [];
  const totalPayments = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(totalPayments / PAGE_SIZE);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: allSuppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
  
  // Filter to only show suppliers (not customers or salesmen)
  const suppliers = allSuppliers.filter(s => s.partyType === "supplier" || !s.partyType);

  const { data: purchaseOrdersData } = useQuery<{ data: PurchaseOrderWithDetails[]; total: number }>({
    queryKey: ["/api/purchase-orders", "all"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders?limit=1000`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
      return res.json();
    },
    enabled: direction === "OUT",
  });

  const allPurchaseOrders = purchaseOrdersData?.data ?? [];
  
  const supplierPurchaseOrders = supplierId 
    ? allPurchaseOrders.filter(po => po.supplierId === parseInt(supplierId))
    : [];

  const createPaymentMutation = useMutation({
    mutationFn: async (data: {
      paymentDate: string;
      direction: string;
      customerId: number | null;
      supplierId: number | null;
      purchaseOrderId: number | null;
      paymentType: string;
      amount: string;
      fxCurrency: string | null;
      fxRate: string | null;
      fxAmount: string | null;
      reference: string | null;
      notes: string | null;
      splits?: { paymentType: string; amount: string; fxCurrency?: string; fxRate?: string; fxAmount?: string }[];
    }) => {
      const response = await apiRequest("POST", "/api/payments", data);
      return response.json();
    },
    onSuccess: async (savedPayment: PaymentWithDetails) => {
      await queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/payments") });
      await queryClient.refetchQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/payments") });
      setPage(1);
      toast({ title: "Payment recorded successfully" });
      if (shouldPrintAfterSave) {
        if (printTypeAfterSave === "thermal") {
          handlePrintPaymentThermal(savedPayment);
        } else {
          handlePrintPaymentA4(savedPayment);
        }
      }
      resetForm();
      setShouldPrintAfterSave(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record payment", description: error.message, variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/payments") });
      toast({ title: "Payment deleted successfully" });
      setPaymentToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete payment", description: error.message, variant: "destructive" });
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: { paymentId: number; phoneNumber: string }) => {
      const res = await apiRequest("POST", "/api/whatsapp/send-payment-receipt", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Receipt Sent",
        description: "Payment receipt has been sent via WhatsApp",
      });
      setShowWhatsAppDialog(false);
      setWhatsAppPhone("");
      setWhatsAppPayment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send receipt via WhatsApp",
        variant: "destructive",
      });
    },
  });

  const { data: userData } = useQuery<{ printerType?: string }>({
    queryKey: ["/api/auth/user"],
  });
  const userPrinterType = userData?.printerType || "thermal";

  const updatePrinterMutation = useMutation({
    mutationFn: async (printerType: string) => {
      return apiRequest("PUT", "/api/auth/user/printer-type", { printerType });
    },
  });

  const handleWhatsAppSend = (payment: PaymentWithDetails) => {
    // Only allow WhatsApp for incoming payments (from customers)
    if (payment.direction !== "IN") return;
    setWhatsAppPhone(payment.customer?.phone || "");
    setWhatsAppPayment(payment);
    setShowWhatsAppDialog(true);
  };

  const handleSendWhatsApp = () => {
    if (!whatsAppPhone.trim() || !whatsAppPayment) {
      toast({
        title: "Phone Required",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    sendWhatsAppMutation.mutate({
      paymentId: whatsAppPayment.id,
      phoneNumber: whatsAppPhone.trim(),
    });
  };

  const resetForm = () => {
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setDirection("IN");
    setCustomerId("");
    setSupplierId("");
    setPurchaseOrderId("");
    setPaymentType("Cash");
    setAmount("");
    setFxCurrency("");
    setFxRate("");
    setFxAmount("");
    setReference("");
    setNotes("");
    setSplitEnabled(false);
    setSplits([{ paymentType: "Cash", amount: "" }, { paymentType: "Knet", amount: "" }]);
  };

  const handlePurchaseOrderSelect = (poId: string) => {
    setPurchaseOrderId(poId);
    if (poId && poId !== "none") {
      const po = allPurchaseOrders.find(p => p.id === parseInt(poId));
      if (po) {
        if (po.fxCurrency) setFxCurrency(po.fxCurrency);
        if (po.fxRate) setFxRate(po.fxRate);
        if (po.totalFx) setFxAmount(po.totalFx);
        if (po.totalKwd) setAmount(po.totalKwd);
      }
    }
  };

  const handleFxAmountChange = (value: string) => {
    setFxAmount(value);
    // If both FX amount and KWD amount exist, calculate the exchange rate
    if (value && amount) {
      const fxAmt = parseFloat(value);
      const kwdAmt = parseFloat(amount);
      if (!isNaN(fxAmt) && !isNaN(kwdAmt) && kwdAmt > 0) {
        setFxRate((fxAmt / kwdAmt).toFixed(4));
      }
    } else if (value && fxRate) {
      // Fallback: if rate exists, calculate KWD
      const rate = parseFloat(fxRate);
      const fxAmt = parseFloat(value);
      if (!isNaN(rate) && !isNaN(fxAmt) && rate > 0) {
        setAmount((fxAmt / rate).toFixed(3));
      }
    }
  };

  const handleFxRateChange = (value: string) => {
    setFxRate(value);
    if (fxAmount && value) {
      const rate = parseFloat(value);
      const fxAmt = parseFloat(fxAmount);
      if (!isNaN(rate) && !isNaN(fxAmt) && rate > 0) {
        setAmount((fxAmt / rate).toFixed(3));
      }
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    // For Payment OUT: if both KWD amount and FX amount exist, calculate exchange rate
    if (direction === "OUT" && value && fxAmount) {
      const kwdAmt = parseFloat(value);
      const fxAmt = parseFloat(fxAmount);
      if (!isNaN(kwdAmt) && !isNaN(fxAmt) && kwdAmt > 0) {
        setFxRate((fxAmt / kwdAmt).toFixed(4));
      }
    }
  };

  const handlePrintPaymentThermal = async (payment: PaymentWithDetails) => {
    const partyName = payment.direction === "IN" 
      ? payment.customer?.name || "Not specified"
      : payment.supplier?.name || "Not specified";
    const partyPhone = payment.direction === "IN"
      ? payment.customer?.phone || ""
      : "";
    const partyLabel = payment.direction === "IN" ? "Received From" : "Paid To";

    let currentBalance = 0;
    let previousBalance = 0;
    const paymentAmount = parseFloat(payment.amount);

    if (payment.direction === "IN" && payment.customerId) {
      try {
        const res = await fetch(`/api/customers/${payment.customerId}/balance`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          currentBalance = data.balance || 0;
          previousBalance = currentBalance + paymentAmount;
        }
      } catch (e) {
        console.error("Failed to fetch customer balance:", e);
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const receiptDate = new Date(payment.paymentDate).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
    const now = new Date();
    const receiptTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    const fxSection = payment.fxCurrency && payment.fxAmount ? `
      <div class="row">
        <span class="label">FX Amount:</span>
        <span class="value">${parseFloat(payment.fxAmount).toFixed(2)} ${payment.fxCurrency}</span>
      </div>
      <div class="row">
        <span class="label">Rate:</span>
        <span class="value">${payment.fxRate || "-"}</span>
      </div>
    ` : "";

    const balanceSection = payment.direction === "IN" && payment.customerId ? `
      <div class="balance-section">
        <div class="row">
          <span class="label">Previous Bal:</span>
          <span class="value">${previousBalance.toFixed(3)} KWD</span>
        </div>
        <div class="row">
          <span class="label">Current Bal:</span>
          <span class="value">${currentBalance.toFixed(3)} KWD</span>
        </div>
      </div>
    ` : "";

    const notesSection = payment.notes ? `<div style="margin: 2mm 0; font-size: 9pt;"><strong>Notes:</strong> ${payment.notes}</div>` : "";
    const phoneRow = partyPhone ? `<div class="row"><span class="label">Phone:</span><span class="value">${partyPhone}</span></div>` : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace;
              width: 80mm; 
              padding: 3mm;
              font-size: 10pt;
              line-height: 1.3;
            }
            .header { text-align: center; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 2mm; }
            .company-name { font-size: 12pt; font-weight: bold; }
            .arabic { font-size: 9pt; }
            .receipt-title { font-size: 11pt; font-weight: bold; margin: 2mm 0; text-align: center; }
            .row { display: flex; justify-content: space-between; margin: 1mm 0; }
            .label { color: #333; }
            .value { font-weight: bold; text-align: right; }
            .divider { border-top: 1px dashed #000; margin: 2mm 0; }
            .total-row { font-size: 12pt; font-weight: bold; }
            .balance-section { background: #f0f0f0; padding: 2mm; margin: 2mm 0; }
            .footer { text-align: center; margin-top: 3mm; font-size: 8pt; border-top: 1px dashed #000; padding-top: 2mm; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">IQBAL ELECTRONICS CO. WLL</div>
            <div class="arabic">شركة إقبال للأجهزة الإلكترونية ذ.م.م</div>
            <div style="font-size: 8pt;">Tel: 22622445 / 22622445</div>
          </div>
          
          <div class="receipt-title">${payment.direction === "IN" ? "PAYMENT RECEIVED" : "PAYMENT VOUCHER"}</div>
          
          <div class="row">
            <span class="label">Date:</span>
            <span class="value">${receiptDate}</span>
          </div>
          <div class="row">
            <span class="label">Time:</span>
            <span class="value">${receiptTime}</span>
          </div>
          <div class="row">
            <span class="label">Receipt #:</span>
            <span class="value">PAY-${payment.id}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="row">
            <span class="label">${partyLabel}:</span>
            <span class="value">${partyName}</span>
          </div>
          ${phoneRow}
          
          <div class="divider"></div>
          
          ${payment.splits && payment.splits.length > 0 ? `
          <div style="margin-bottom: 2mm;">
            <div style="font-weight: bold; margin-bottom: 1mm;">Payment Breakdown:</div>
            ${payment.splits.map((split: { paymentType: string; amount: string }) => `
              <div class="row">
                <span class="label">${split.paymentType}:</span>
                <span class="value">${parseFloat(split.amount).toFixed(3)} KWD</span>
              </div>
            `).join('')}
          </div>
          ` : `
          <div class="row">
            <span class="label">Payment Type:</span>
            <span class="value">${payment.paymentType}</span>
          </div>
          `}
          
          ${fxSection}
          
          <div class="divider"></div>
          
          <div class="total-row row">
            <span>AMOUNT (KWD):</span>
            <span>${parseFloat(payment.amount).toFixed(3)}</span>
          </div>
          
          ${balanceSection}
          
          ${notesSection}
          
          <div class="footer">
            Thank You!<br/>
            Computer Generated Receipt
          </div>
          
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handlePrintPaymentA4 = async (payment: PaymentWithDetails) => {
    const partyName = payment.direction === "IN" 
      ? payment.customer?.name || "Not specified"
      : payment.supplier?.name || "Not specified";
    const partyPhone = payment.direction === "IN"
      ? payment.customer?.phone || ""
      : "";
    const partyLabel = payment.direction === "IN" ? "Received From" : "Paid To";

    let currentBalance = 0;
    let previousBalance = 0;
    const paymentAmount = parseFloat(payment.amount);

    if (payment.direction === "IN" && payment.customerId) {
      try {
        const res = await fetch(`/api/customers/${payment.customerId}/balance`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          currentBalance = data.balance || 0;
          previousBalance = currentBalance + paymentAmount;
        }
      } catch (e) {
        console.error("Failed to fetch customer balance:", e);
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const now = new Date();
    const receiptTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt Voucher</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Segoe UI', Arial, sans-serif;
              background: #fff;
              color: #000;
              line-height: 1.4;
              font-size: 11pt;
            }
            
            .receipt {
              max-width: 210mm;
              margin: 0 auto;
              padding: 5mm;
            }
            
            .voucher-title {
              text-align: center;
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 5mm;
              color: #333;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding-bottom: 4mm;
              border-bottom: 2px solid #666;
              margin-bottom: 5mm;
            }
            
            .company-info {
              text-align: left;
            }
            
            .company-logo {
              font-size: 24pt;
              font-weight: bold;
              color: #333;
            }
            
            .company-arabic {
              font-size: 9pt;
              color: #666;
            }
            
            .company-contact {
              text-align: right;
            }
            
            .company-name-right {
              font-size: 12pt;
              font-weight: bold;
            }
            
            .phone-no {
              font-size: 10pt;
              color: #333;
            }
            
            .main-title {
              text-align: center;
              font-size: 16pt;
              font-weight: bold;
              margin: 5mm 0;
              color: #333;
            }
            
            .content-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5mm;
            }
            
            .left-section {
              width: 55%;
            }
            
            .right-section {
              width: 40%;
              text-align: right;
            }
            
            .section-title {
              font-weight: bold;
              font-size: 10pt;
              color: #333;
              margin-bottom: 1mm;
            }
            
            .party-name {
              font-size: 12pt;
              font-weight: bold;
              margin-bottom: 2mm;
            }
            
            .party-details {
              font-size: 10pt;
              color: #333;
            }
            
            .receipt-details {
              font-size: 10pt;
            }
            
            .receipt-details div {
              margin-bottom: 1mm;
            }
            
            .amounts-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5mm;
            }
            
            .amounts-table th,
            .amounts-table td {
              padding: 3mm 4mm;
              text-align: left;
              font-size: 10pt;
            }
            
            .amounts-table .header-row th {
              background: #6b5b95;
              color: white;
              font-weight: bold;
            }
            
            .amounts-table .data-row td {
              border-bottom: 1px solid #ddd;
            }
            
            .amounts-table .amount-col {
              text-align: right;
              width: 30%;
            }
            
            .footer {
              text-align: center;
              padding-top: 5mm;
              margin-top: 5mm;
              border-top: 1px solid #ddd;
              font-size: 9pt;
              color: #666;
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="voucher-title">Payment Receipt Voucher</div>
            
            <div class="header">
              <div class="company-info">
                ${logoBase64 ? `<img src="${logoBase64}" style="height: 50px; width: auto;" alt="IEC" />` : `<div class="company-logo">IEC</div>`}
                <div class="company-arabic">شركة إقبال للأجهزة الإلكترونية ذ.م.م</div>
              </div>
              <div class="company-contact">
                <div class="company-name-right">Iqbal Electronics Co. WLL</div>
                <div class="phone-no">Phone no.: +965 55584488</div>
              </div>
            </div>
            
            <div class="main-title">Payment Receipt Voucher</div>
            
            <div class="content-section">
              <div class="left-section">
                <div class="section-title">${partyLabel}</div>
                <div class="party-name">${partyName}</div>
                <div class="party-details">Kuwait</div>
                ${partyPhone ? `<div class="party-details">Contact No.: ${partyPhone}</div>` : ""}
              </div>
              <div class="right-section">
                <div class="section-title">Receipt Details</div>
                <div class="receipt-details">
                  <div>Receipt No.: ${payment.id}</div>
                  <div>Date: ${formatDate(payment.paymentDate)}</div>
                  <div>Time: ${receiptTime}</div>
                </div>
              </div>
            </div>
            
            <table class="amounts-table">
              <tr class="header-row">
                <th>Amount in words</th>
                <th class="amount-col">Amounts</th>
              </tr>
              <tr class="data-row">
                <td>${numberToWords(paymentAmount)} Dinars only</td>
                <td class="amount-col">${payment.direction === "IN" ? "Received" : "Paid"}</td>
              </tr>
              <tr class="data-row">
                <td></td>
                <td class="amount-col" style="font-weight: bold;">KWD ${paymentAmount.toFixed(3)}</td>
              </tr>
              ${payment.direction === "IN" ? `
              <tr class="header-row">
                <th>Payment mode</th>
                <th class="amount-col"></th>
              </tr>
              ${payment.splits && payment.splits.length > 0 ? 
                payment.splits.map((split: { paymentType: string; amount: string }) => `
                  <tr class="data-row">
                    <td>${split.paymentType.toUpperCase()}: KWD ${parseFloat(split.amount).toFixed(3)}</td>
                    <td class="amount-col"></td>
                  </tr>
                `).join('') : `
                <tr class="data-row">
                  <td>${payment.paymentType.toUpperCase()}</td>
                  <td class="amount-col"></td>
                </tr>
              `}
              <tr class="data-row">
                <td></td>
                <td class="amount-col">Previous Balance</td>
              </tr>
              <tr class="data-row">
                <td></td>
                <td class="amount-col" style="font-weight: bold;">KWD ${previousBalance.toFixed(3)}</td>
              </tr>
              <tr class="data-row">
                <td></td>
                <td class="amount-col">Current Balance</td>
              </tr>
              <tr class="data-row">
                <td></td>
                <td class="amount-col" style="font-weight: bold;">KWD ${currentBalance.toFixed(3)}</td>
              </tr>
              ` : `
              <tr class="header-row">
                <th>Payment mode</th>
                <th class="amount-col"></th>
              </tr>
              ${payment.splits && payment.splits.length > 0 ? 
                payment.splits.map((split: { paymentType: string; amount: string }) => `
                  <tr class="data-row">
                    <td>${split.paymentType.toUpperCase()}: KWD ${parseFloat(split.amount).toFixed(3)}</td>
                    <td class="amount-col"></td>
                  </tr>
                `).join('') : `
                <tr class="data-row">
                  <td>${payment.paymentType.toUpperCase()}</td>
                  <td class="amount-col"></td>
                </tr>
              `}
              `}
            </table>
            
            ${payment.notes ? `<div style="margin-top: 5mm; font-size: 10pt;"><strong>Notes:</strong> ${payment.notes}</div>` : ""}
            
            <div class="footer">
              Thank You for your payment!<br/>
              Computer Generated Receipt
            </div>
          </div>
          
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handlePrintPayment = (payment: PaymentWithDetails) => {
    if (userPrinterType === "thermal") {
      handlePrintPaymentThermal(payment);
    } else {
      handlePrintPaymentA4(payment);
    }
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million'];
    
    if (num === 0) return 'Zero';
    
    const wholeNum = Math.floor(num);
    if (wholeNum === 0) return 'Zero';
    
    let words = '';
    let scaleIndex = 0;
    let n = wholeNum;
    
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        let chunkWords = '';
        const hundreds = Math.floor(chunk / 100);
        const remainder = chunk % 100;
        
        if (hundreds > 0) {
          chunkWords += ones[hundreds] + ' Hundred ';
        }
        
        if (remainder < 20) {
          chunkWords += ones[remainder];
        } else {
          chunkWords += tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10];
        }
        
        words = chunkWords.trim() + ' ' + scales[scaleIndex] + ' ' + words;
      }
      n = Math.floor(n / 1000);
      scaleIndex++;
    }
    
    return words.trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (splitEnabled) {
      // Validate splits
      const validSplits = splits.filter(s => s.amount && parseFloat(s.amount) > 0);
      if (validSplits.length < 2) {
        toast({ title: "Split payment requires at least 2 payment methods with amounts", variant: "destructive" });
        return;
      }
      const total = validSplits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      if (total <= 0) {
        toast({ title: "Please enter valid amounts", variant: "destructive" });
        return;
      }
      
      if (direction === "IN" && !customerId) {
        toast({ title: "Please select a customer", variant: "destructive" });
        return;
      }
      
      createPaymentMutation.mutate({
        paymentDate,
        direction,
        customerId: direction === "IN" && customerId ? parseInt(customerId) : null,
        supplierId: direction === "OUT" && supplierId ? parseInt(supplierId) : null,
        purchaseOrderId: direction === "OUT" && purchaseOrderId ? parseInt(purchaseOrderId) : null,
        paymentType: validSplits[0].paymentType,
        amount: total.toFixed(3),
        fxCurrency: null,
        fxRate: null,
        fxAmount: null,
        reference: null,
        notes: notes || null,
        splits: validSplits.map(s => ({
          paymentType: s.paymentType,
          amount: s.amount,
          fxCurrency: s.fxCurrency || undefined,
          fxRate: s.fxRate || undefined,
          fxAmount: s.fxAmount || undefined,
        })),
      });
    } else {
      if (!amount || parseFloat(amount) <= 0) {
        toast({ title: "Please enter a valid amount", variant: "destructive" });
        return;
      }

      if (direction === "IN" && !customerId) {
        toast({ title: "Please select a customer", variant: "destructive" });
        return;
      }

      createPaymentMutation.mutate({
        paymentDate,
        direction,
        customerId: direction === "IN" && customerId ? parseInt(customerId) : null,
        supplierId: direction === "OUT" && supplierId ? parseInt(supplierId) : null,
        purchaseOrderId: direction === "OUT" && purchaseOrderId ? parseInt(purchaseOrderId) : null,
        paymentType,
        amount,
        fxCurrency: direction === "OUT" && fxCurrency ? fxCurrency : null,
        fxRate: direction === "OUT" && fxRate ? fxRate : null,
        fxAmount: direction === "OUT" && fxAmount ? fxAmount : null,
        reference: null,
        notes: notes || null,
      });
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const partyName = payment.direction === "IN" 
      ? payment.customer?.name 
      : payment.supplier?.name;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      (partyName?.toLowerCase() ?? "").includes(searchLower) ||
      (payment.reference?.toLowerCase() ?? "").includes(searchLower) ||
      payment.paymentType.toLowerCase().includes(searchLower);
    
    const matchesType = paymentTypeFilter === "all" || payment.paymentType === paymentTypeFilter;
    const matchesDirection = directionFilter === "all" || payment.direction === directionFilter;
    
    return matchesSearch && matchesType && matchesDirection;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "Cash":
        return "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200";
      case "NBK Bank":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "CBK Bank":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Knet":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "Wamd":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      default:
        return "";
    }
  };

  const getDirectionBadge = (dir: string) => {
    if (dir === "IN") {
      return (
        <Badge variant="secondary" className="bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
          <ArrowDownLeft className="h-3 w-3 mr-1" />
          IN
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <ArrowUpRight className="h-3 w-3 mr-1" />
        OUT
      </Badge>
    );
  };

  const totalIn = filteredPayments
    .filter(p => p.direction === "IN")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  
  const totalOut = filteredPayments
    .filter(p => p.direction === "OUT")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const { data: todaySummary } = useQuery<{ total: number; byType: Record<string, number>; date: string }>({
    queryKey: ["/api/payments/today-summary"],
  });

  const todayTotalIn = todaySummary?.total ?? 0;
  const todayByType = todaySummary?.byType ?? { Cash: 0, "NBK Bank": 0, "CBK Bank": 0, Knet: 0, Wamd: 0 };

  if (paymentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-900">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Payment In</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-total-payment-in">
                  {todayTotalIn.toFixed(3)} KWD
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900">
                <Banknote className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
                <span className="text-xs text-green-700 dark:text-green-300">Cash</span>
                <span className="text-sm font-semibold text-green-800 dark:text-green-200" data-testid="text-today-cash">{todayByType.Cash.toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900">
                <Building2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                <span className="text-xs text-blue-700 dark:text-blue-300">NBK</span>
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200" data-testid="text-today-nbk">{todayByType["NBK Bank"].toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900">
                <Building2 className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />
                <span className="text-xs text-purple-700 dark:text-purple-300">CBK</span>
                <span className="text-sm font-semibold text-purple-800 dark:text-purple-200" data-testid="text-today-cbk">{todayByType["CBK Bank"].toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900">
                <CreditCard className="h-3.5 w-3.5 text-orange-700 dark:text-orange-300" />
                <span className="text-xs text-orange-700 dark:text-orange-300">Knet</span>
                <span className="text-sm font-semibold text-orange-800 dark:text-orange-200" data-testid="text-today-knet">{todayByType.Knet.toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-pink-100 dark:bg-pink-900">
                <CreditCard className="h-3.5 w-3.5 text-pink-700 dark:text-pink-300" />
                <span className="text-xs text-pink-700 dark:text-pink-300">Wamd</span>
                <span className="text-sm font-semibold text-pink-800 dark:text-pink-200" data-testid="text-today-wamd">{todayByType.Wamd.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </CardTitle>
          <div className="flex items-center gap-4">
            <span className={`font-medium text-sm ${direction === "IN" ? "text-emerald-600" : "text-muted-foreground"}`}>
              Payment IN
            </span>
            <Switch
              checked={direction === "OUT"}
              onCheckedChange={(checked) => {
                setDirection(checked ? "OUT" : "IN");
                setCustomerId("");
                setSupplierId("");
              }}
              data-testid="switch-payment-direction"
            />
            <span className={`font-medium text-sm ${direction === "OUT" ? "text-red-600" : "text-muted-foreground"}`}>
              Payment OUT
            </span>
            <Button variant="outline" size="sm" onClick={resetForm} data-testid="button-reset-payment">
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {direction === "IN" ? (
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger data-testid="select-payment-customer">
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
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier (Paid to)</Label>
                    <Select value={supplierId || "none"} onValueChange={(v) => {
                      setSupplierId(v === "none" ? "" : v);
                      setPurchaseOrderId("");
                    }}>
                      <SelectTrigger data-testid="select-payment-supplier">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- No supplier --</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {supplierId && (
                    <div className="space-y-2">
                      <Label htmlFor="purchaseOrder">Link to Purchase Order</Label>
                      <Select value={purchaseOrderId || "none"} onValueChange={(v) => handlePurchaseOrderSelect(v === "none" ? "" : v)}>
                        <SelectTrigger data-testid="select-payment-po">
                          <SelectValue placeholder="Select PO (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- No PO --</SelectItem>
                          {supplierPurchaseOrders.map((po) => (
                            <SelectItem key={po.id} value={po.id.toString()}>
                              {po.invoiceNumber || `PO #${po.id}`} - {po.totalKwd} KWD ({po.purchaseDate})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  data-testid="input-payment-date"
                />
              </div>
              {!splitEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                    <SelectTrigger data-testid="select-payment-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {direction === "OUT" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fxCurrency">Foreign Currency</Label>
                  <Select value={fxCurrency || "none"} onValueChange={(v) => setFxCurrency(v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="select-fx-currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- None --</SelectItem>
                      {FX_CURRENCIES.map((curr) => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fxRate">Exchange Rate</Label>
                  <Input
                    id="fxRate"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={fxRate}
                    onChange={(e) => handleFxRateChange(e.target.value)}
                    placeholder="0.0000"
                    data-testid="input-fx-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fxAmount">Amount ({fxCurrency || "FX"})</Label>
                  <Input
                    id="fxAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fxAmount}
                    onChange={(e) => handleFxAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="!text-3xl h-14 font-semibold placeholder:text-muted-foreground/30 placeholder:font-normal"
                    data-testid="input-fx-amount"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 py-2 border-t">
              <Switch
                checked={splitEnabled}
                onCheckedChange={setSplitEnabled}
                data-testid="switch-split-payment"
              />
              <Label className="text-sm">Split Payment (Multiple payment methods)</Label>
            </div>

            {splitEnabled ? (
              <div className="space-y-3 p-4 border rounded-md bg-muted/30">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Payment Methods</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addSplit}
                    data-testid="button-add-split"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Method
                  </Button>
                </div>
                {splits.map((split, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={split.paymentType}
                        onValueChange={(v) => updateSplit(index, "paymentType", v)}
                      >
                        <SelectTrigger data-testid={`select-split-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Amount (KWD)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={split.amount}
                        onChange={(e) => updateSplit(index, "amount", e.target.value)}
                        placeholder="0.000"
                        data-testid={`input-split-amount-${index}`}
                      />
                    </div>
                    {splits.length > 2 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSplit(index)}
                        data-testid={`button-remove-split-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Total:</span>
                  <span className="text-xl font-bold font-mono">{splitTotal.toFixed(3)} KWD</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KWD)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  min="0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.000"
                  required
                  className="!text-3xl h-14 font-semibold placeholder:text-muted-foreground/30 placeholder:font-normal"
                  data-testid="input-payment-amount"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                data-testid="input-payment-notes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="submit" 
                variant="outline"
                disabled={createPaymentMutation.isPending} 
                onClick={() => setShouldPrintAfterSave(false)}
                data-testid="button-save-payment"
              >
                {createPaymentMutation.isPending && !shouldPrintAfterSave ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    type="button"
                    disabled={createPaymentMutation.isPending && shouldPrintAfterSave}
                    data-testid="button-save-print-payment"
                  >
                    {createPaymentMutation.isPending && shouldPrintAfterSave ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4 mr-2" />
                        Save & Print ({userPrinterType === "thermal" ? "Thermal" : "A4"})
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (userPrinterType !== "thermal") updatePrinterMutation.mutate("thermal");
                      setPrintTypeAfterSave("thermal");
                      setShouldPrintAfterSave(true);
                      const form = document.querySelector("form");
                      form?.requestSubmit();
                    }}
                    data-testid="menu-save-print-thermal"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Thermal (80mm)
                    {userPrinterType === "thermal" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (userPrinterType !== "a4laser") updatePrinterMutation.mutate("a4laser");
                      setPrintTypeAfterSave("a4");
                      setShouldPrintAfterSave(true);
                      const form = document.querySelector("form");
                      form?.requestSubmit();
                    }}
                    data-testid="menu-save-print-a4"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    A4 Laser
                    {userPrinterType === "a4laser" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer/supplier, reference..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-search-payments"
              />
            </div>
            <Select value={directionFilter} onValueChange={handleDirectionFilterChange}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-direction">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="IN">Payment IN</SelectItem>
                <SelectItem value="OUT">Payment OUT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentTypeFilter} onValueChange={handlePaymentTypeFilterChange}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-payment-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments found</p>
              <p className="text-sm">Click "New Payment" to record a payment</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-left py-3 px-2 font-medium">Direction</th>
                      <th className="text-left py-3 px-2 font-medium">Customer/Supplier</th>
                      <th className="text-left py-3 px-2 font-medium">Type</th>
                      <th className="text-right py-3 px-2 font-medium">Amount (KWD)</th>
                      <th className="text-left py-3 px-2 font-medium">Reference</th>
                      <th className="text-center py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr 
                        key={payment.id} 
                        className="border-b hover-elevate"
                        data-testid={`row-payment-${payment.id}`}
                      >
                        <td className="py-3 px-2">
                          <span className="font-mono text-xs">
                            {formatDate(payment.paymentDate)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {getDirectionBadge(payment.direction)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {payment.direction === "IN" ? (
                              <>
                                <User className="h-4 w-4 text-muted-foreground" />
                                {payment.customer?.name || "-"}
                              </>
                            ) : (
                              <>
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {payment.supplier?.name || "-"}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getPaymentTypeColor(payment.paymentType)}`}
                          >
                            {payment.paymentType}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          {parseFloat(payment.amount).toFixed(3)}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">
                          {payment.reference || "-"}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelectedPayment(payment)}
                              data-testid={`button-view-payment-${payment.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setPaymentToDelete(payment)}
                                data-testid={`button-delete-payment-${payment.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50">
                      <td colSpan={4} className="py-3 px-2 font-medium">
                        Summary ({filteredPayments.length} payments)
                      </td>
                      <td colSpan={3} className="py-3 px-2">
                        <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                            <span className="text-muted-foreground">IN:</span>
                            <span className="font-mono font-bold text-emerald-600">{totalIn.toFixed(3)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                            <span className="text-muted-foreground">OUT:</span>
                            <span className="font-mono font-bold text-red-600">{totalOut.toFixed(3)}</span>
                          </div>
                          <div className="border-l pl-4 flex items-center gap-2">
                            <span className="text-muted-foreground">Net:</span>
                            <span className={`font-mono font-bold ${totalIn - totalOut >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {(totalIn - totalOut).toFixed(3)} KWD
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, totalPayments)} of {totalPayments} payments
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedPayment.paymentDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direction</p>
                  <div className="mt-1">{getDirectionBadge(selectedPayment.direction)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPayment.direction === "IN" ? "Customer" : "Supplier"}
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    {selectedPayment.direction === "IN" ? (
                      <>
                        <User className="h-4 w-4" />
                        {selectedPayment.customer?.name || "Not specified"}
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4" />
                        {selectedPayment.supplier?.name || "Not specified"}
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge className={`mt-1 ${getPaymentTypeColor(selectedPayment.paymentType)}`}>
                    {selectedPayment.paymentType}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className={`text-2xl font-bold font-mono flex items-center gap-2 ${selectedPayment.direction === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                  <Banknote className="h-6 w-6" />
                  {selectedPayment.direction === "OUT" ? "-" : "+"}{parseFloat(selectedPayment.amount).toFixed(3)} KWD
                </p>
              </div>
              
              {selectedPayment.reference && (
                <div>
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="font-mono text-sm">{selectedPayment.reference}</p>
                </div>
              )}
              
              {selectedPayment.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-print-payment">
                  <Printer className="h-4 w-4 mr-2" />
                  Print ({userPrinterType === "thermal" ? "Thermal" : "A4"})
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={() => {
                    if (userPrinterType !== "thermal") updatePrinterMutation.mutate("thermal");
                    selectedPayment && handlePrintPaymentThermal(selectedPayment);
                  }}
                  data-testid="menu-print-thermal"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Thermal (80mm)
                  {userPrinterType === "thermal" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    if (userPrinterType !== "a4laser") updatePrinterMutation.mutate("a4laser");
                    selectedPayment && handlePrintPaymentA4(selectedPayment);
                  }}
                  data-testid="menu-print-a4"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  A4 Laser
                  {userPrinterType === "a4laser" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedPayment?.direction === "IN" && (
              <Button 
                variant="outline" 
                onClick={() => selectedPayment && handleWhatsAppSend(selectedPayment)}
                className="text-green-600"
                data-testid="button-whatsapp-payment"
              >
                <SiWhatsapp className="h-4 w-4 mr-2" />
                Send Receipt
              </Button>
            )}
            <Button onClick={() => setSelectedPayment(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showWhatsAppDialog} 
        onOpenChange={(open) => {
          setShowWhatsAppDialog(open);
          if (!open) {
            setWhatsAppPhone("");
            setWhatsAppPayment(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SiWhatsapp className="h-5 w-5 text-green-600" />
              Send Receipt via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Send this payment receipt directly to the customer's WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone-payment">Phone Number</Label>
              <Input
                id="whatsapp-phone-payment"
                placeholder="e.g., 96599123456"
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                data-testid="input-whatsapp-phone-payment"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full phone number with country code (e.g., 965 for Kuwait)
              </p>
            </div>
            {whatsAppPayment && (
              <div className="p-3 rounded-md bg-muted/50 text-sm">
                <p className="font-medium mb-1">
                  Payment from {whatsAppPayment.customer?.name || "Customer"}
                </p>
                <p className="text-muted-foreground">
                  Amount: {parseFloat(whatsAppPayment.amount).toFixed(3)} KWD
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWhatsAppDialog(false)}
              data-testid="button-cancel-whatsapp-payment"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              disabled={sendWhatsAppMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-whatsapp-payment"
            >
              {sendWhatsAppMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Receipt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {paymentToDelete?.direction === "IN" ? "incoming" : "outgoing"} payment of{" "}
              <strong>{paymentToDelete ? parseFloat(paymentToDelete.amount).toFixed(3) : 0} KWD</strong>
              {paymentToDelete?.direction === "IN" && paymentToDelete?.customer 
                ? ` from ${paymentToDelete.customer.name}` 
                : paymentToDelete?.direction === "OUT" && paymentToDelete?.supplier
                  ? ` to ${paymentToDelete.supplier.name}`
                  : ""}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-payment"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
