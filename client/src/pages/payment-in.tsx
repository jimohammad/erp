import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import companyLogoUrl from "@/assets/company-logo.jpg";
import { generateQRCodeDataURL } from "@/lib/qrcode";
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
  Trash2, 
  Loader2, 
  Save, 
  Search,
  Eye,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Printer,
  Send,
  Plus,
  ChevronDown,
  FileText,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { PaymentWithDetails, Customer, PaymentType, User } from "@shared/schema";
import { PAYMENT_TYPES } from "@shared/schema";

const PAGE_SIZE = 25;

export default function PaymentInPage() {
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
  
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [shouldPrintAfterSave, setShouldPrintAfterSave] = useState(false);
  const [printTypeAfterSave, setPrintTypeAfterSave] = useState<"thermal" | "a5">("a5");
  const [customerId, setCustomerId] = useState("");
  
  // Get user's printer preference
  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });
  
  const userPrinterType = userData?.printerType || "a5";

  // Mutation to update printer preference
  const updatePrinterMutation = useMutation({
    mutationFn: async (printerType: string) => {
      return apiRequest("PUT", "/api/auth/user/printer-type", { printerType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  
  // Cheque payment details
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBankName, setChequeBankName] = useState("");
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split("T")[0]);
  const [chequeDrawerName, setChequeDrawerName] = useState("");
  const [chequeNotes, setChequeNotes] = useState("");
  
  // Split payment state
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splits, setSplits] = useState<Array<{ paymentType: PaymentType; amount: string }>>([
    { paymentType: "Cash", amount: "" },
    { paymentType: "Knet", amount: "" },
  ]);
  
  const splitTotal = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  
  const addSplit = () => {
    setSplits([...splits, { paymentType: "Cash", amount: "" }]);
  };
  
  const removeSplit = (index: number) => {
    if (splits.length > 2) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };
  
  const updateSplit = (index: number, field: "paymentType" | "amount", value: string) => {
    const newSplits = [...splits];
    if (field === "paymentType") {
      newSplits[index].paymentType = value as PaymentType;
    } else {
      newSplits[index].amount = value;
    }
    setSplits(newSplits);
  };

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ data: PaymentWithDetails[]; total: number }>({
    queryKey: ["/api/payments", "IN", page],
    queryFn: async () => {
      const res = await fetch(`/api/payments?direction=IN&limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`, {
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

  // Fetch selected customer's balance
  const { data: customerBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/customers", customerId, "balance"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customerId}/balance`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
    enabled: !!customerId,
  });

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
      splits?: Array<{ paymentType: string; amount: string; fxCurrency?: string; fxRate?: string; fxAmount?: string }>;
      chequeDetails?: { chequeNumber: string; bankName: string; chequeDate: string; drawerName?: string; notes?: string };
    }) => {
      const response = await apiRequest("POST", "/api/payments", data);
      return response.json();
    },
    onSuccess: async (savedPayment: PaymentWithDetails) => {
      await queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/payments") });
      await queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("/api/customers") });
      await queryClient.refetchQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/payments") });
      setPage(1);
      toast({ title: "Payment received successfully" });
      if (shouldPrintAfterSave) {
        if (printTypeAfterSave === "a5") {
          handlePrintPaymentA5(savedPayment);
        } else {
          handlePrintPaymentThermal(savedPayment);
        }
      }
      resetForm();
      setShouldPrintAfterSave(false);
      setPrintTypeAfterSave("a5");
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
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("/api/customers") });
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

  const handleWhatsAppSend = (payment: PaymentWithDetails) => {
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
    setCustomerId("");
    setPaymentType("Cash");
    setAmount("");
    setNotes("");
    // Reset cheque fields
    setChequeNumber("");
    setChequeBankName("");
    setChequeDate(new Date().toISOString().split("T")[0]);
    setChequeDrawerName("");
    setChequeNotes("");
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }
    
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
      
      createPaymentMutation.mutate({
        paymentDate,
        direction: "IN",
        customerId: parseInt(customerId),
        supplierId: null,
        purchaseOrderId: null,
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
        })),
      });
    } else {
      if (!amount || parseFloat(amount) <= 0) {
        toast({ title: "Please enter a valid amount", variant: "destructive" });
        return;
      }
      
      // Validate cheque details if payment type is Cheque
      if (paymentType === "Cheque") {
        if (!chequeNumber.trim()) {
          toast({ title: "Cheque number is required", variant: "destructive" });
          return;
        }
        if (!chequeBankName.trim()) {
          toast({ title: "Bank name is required", variant: "destructive" });
          return;
        }
        if (!chequeDate) {
          toast({ title: "Cheque date is required", variant: "destructive" });
          return;
        }
      }

      createPaymentMutation.mutate({
        paymentDate,
        direction: "IN",
        customerId: parseInt(customerId),
        supplierId: null,
        purchaseOrderId: null,
        paymentType,
        amount,
        fxCurrency: null,
        fxRate: null,
        fxAmount: null,
        reference: null,
        notes: notes || null,
        ...(paymentType === "Cheque" && {
          chequeDetails: {
            chequeNumber: chequeNumber.trim(),
            bankName: chequeBankName.trim(),
            chequeDate,
            drawerName: chequeDrawerName.trim() || undefined,
            notes: chequeNotes.trim() || undefined,
          },
        }),
      });
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const partyName = payment.customer?.name;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      (partyName?.toLowerCase() ?? "").includes(searchLower) ||
      (payment.reference?.toLowerCase() ?? "").includes(searchLower) ||
      payment.paymentType.toLowerCase().includes(searchLower);
    
    const matchesType = paymentTypeFilter === "all" || payment.paymentType === paymentTypeFilter;
    
    return matchesSearch && matchesType;
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
      case "Cheque":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default:
        return "";
    }
  };

  const totalReceived = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                  'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];
    
    const [whole, decimal] = num.toFixed(3).split('.');
    const wholeNum = parseInt(whole);
    const fils = parseInt(decimal);
    
    const convertChunk = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
    };
    
    let words = '';
    let scaleIndex = 0;
    let n = wholeNum;
    
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        words = convertChunk(chunk) + ' ' + scales[scaleIndex] + ' ' + words;
      }
      n = Math.floor(n / 1000);
      scaleIndex++;
    }
    
    let result = words.trim() + ' Dinars';
    if (fils > 0) {
      result += ' and ' + convertChunk(fils) + ' Fils';
    }
    return result;
  };

  const handlePrintPaymentThermal = async (payment: PaymentWithDetails) => {
    const customerName = payment.customer?.name || "Customer";
    const customerPhone = payment.customer?.phone || "";
    const amountNum = parseFloat(payment.amount);
    const amountWords = numberToWords(amountNum);

    // Generate QR code
    const qrDataUrl = await generateQRCodeDataURL({
      type: 'PAYMENT_IN',
      id: payment.id,
      number: `PAY-${payment.id}`,
      amount: amountNum.toFixed(3),
      date: payment.paymentDate,
      partyName: customerName,
      partyType: 'customer',
    });

    let currentBalance = 0;
    let previousBalance = 0;

    if (payment.customerId) {
      try {
        const res = await fetch(`/api/customers/${payment.customerId}/balance`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          currentBalance = data.balance || 0;
          previousBalance = currentBalance + amountNum;
        }
      } catch (e) {
        console.error("Failed to fetch customer balance:", e);
      }
    }

    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) return;

    const receiptDate = new Date(payment.paymentDate).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
    const receiptTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    const balanceSection = payment.customerId ? `
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

    const splitPaymentSection = payment.splits && payment.splits.length > 0 ? `
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
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 76mm; 
            margin: 0 auto; 
            padding: 2mm;
            font-size: 10pt;
          }
          .header { text-align: center; margin-bottom: 2mm; }
          .company-name { font-size: 12pt; font-weight: bold; }
          .arabic { font-size: 9pt; }
          .receipt-title { font-size: 11pt; font-weight: bold; margin: 2mm 0; text-align: center; }
          .row { display: flex; justify-content: space-between; margin: 1mm 0; }
          .label { color: #333; }
          .value { font-weight: bold; text-align: right; }
          .divider { border-top: 1px dashed #000; margin: 2mm 0; }
          .total-row { font-size: 12pt; font-weight: bold; }
          .balance-section { border: 1px solid #000; padding: 2mm; margin: 2mm 0; }
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
        
        <div class="receipt-title">PAYMENT RECEIVED</div>
        
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
          <span class="label">Received From:</span>
          <span class="value">${customerName}</span>
        </div>
        ${customerPhone ? `<div class="row"><span class="label">Phone:</span><span class="value">${customerPhone}</span></div>` : ""}
        
        <div class="divider"></div>
        
        ${splitPaymentSection}
        
        <div class="divider"></div>
        
        <div class="row total-row">
          <span>TOTAL RECEIVED:</span>
          <span>${amountNum.toFixed(3)} KWD</span>
        </div>
        <div style="font-size: 8pt; text-align: center; font-style: italic; margin-top: 1mm;">
          ${amountWords}
        </div>
        
        ${balanceSection}
        
        ${payment.notes ? `<div class="row"><span class="label">Notes:</span><span class="value">${payment.notes}</span></div>` : ""}
        
        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>Printed: ${new Date().toLocaleString()}</p>
        </div>
        ${qrDataUrl ? `
        <div style="text-align:center;margin-top:10px;padding-top:8px;border-top:1px dashed #000;">
          <img src="${qrDataUrl}" alt="QR Code" style="width:60px;height:60px;" />
          <div style="font-size:8px;margin-top:3px;">Scan to verify</div>
        </div>
        ` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintPaymentA5 = async (payment: PaymentWithDetails) => {
    const customerName = payment.customer?.name || "Customer";
    const customerPhone = payment.customer?.phone || "";
    const amountNum = parseFloat(payment.amount);
    const amountWords = numberToWords(amountNum);

    // Generate QR code
    const qrDataUrl = await generateQRCodeDataURL({
      type: 'PAYMENT_IN',
      id: payment.id,
      number: `PAY-${payment.id}`,
      amount: amountNum.toFixed(3),
      date: payment.paymentDate,
      partyName: customerName,
      partyType: 'customer',
    });

    let currentBalance = 0;
    let previousBalance = 0;

    if (payment.customerId) {
      try {
        const res = await fetch(`/api/customers/${payment.customerId}/balance`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          currentBalance = data.balance || 0;
          previousBalance = currentBalance + amountNum;
        }
      } catch (e) {
        console.error("Failed to fetch customer balance:", e);
      }
    }

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    const receiptDate = new Date(payment.paymentDate).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });

    const paymentModeHtml = payment.splits && payment.splits.length > 0 
      ? payment.splits.map((split: { paymentType: string; amount: string }) => 
          `<tr><td style="padding:4px 3px;border:1px solid #000;">${split.paymentType.toUpperCase()}</td><td style="padding:4px 3px;border:1px solid #000;text-align:right;">${parseFloat(split.amount).toFixed(3)}</td></tr>`
        ).join('')
      : `<tr><td style="padding:4px 3px;border:1px solid #000;">${payment.paymentType.toUpperCase()}</td><td style="padding:4px 3px;border:1px solid #000;text-align:right;">${amountNum.toFixed(3)}</td></tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt ${payment.id}</title>
        <style>
          @page { size: A5; margin: 6mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 9px; color: #000; }
          .header { border: 1px solid #000; padding: 10px 12px; display: flex; align-items: center; gap: 12px; }
          .logo { width: 50px; height: 50px; border: 1px solid #000; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .company-info { flex: 1; }
          .company-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .company-details { font-size: 8px; }
          .receipt-title { text-align: right; }
          .receipt-title h1 { font-size: 16px; margin-bottom: 2px; }
          .receipt-title div { font-size: 9px; }
          .content { padding: 10px 12px; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
          .info-box { border: 1px solid #000; padding: 8px; border-radius: 3px; flex: 1; }
          .info-box h3 { font-weight: bold; margin-bottom: 5px; font-size: 10px; }
          .info-row { margin: 2px 0; font-size: 9px; }
          .info-label { font-weight: bold; display: inline-block; width: 60px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th { border: 1px solid #000; padding: 4px 3px; text-align: left; font-size: 8px; font-weight: bold; }
          td { font-size: 9px; }
          .amount-words { border: 1px solid #000; padding: 8px; margin: 8px 0; font-size: 10px; font-style: italic; text-align: center; }
          .totals-section { display: flex; justify-content: flex-end; }
          .totals-box { width: 180px; border: 1px solid #000; padding: 8px; border-radius: 3px; }
          .totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px; }
          .totals-row.total { font-weight: bold; font-size: 10px; border-top: 2px solid #000; padding-top: 5px; margin-top: 3px; }
          .footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #000; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 20px; }
          .signature-box { width: 120px; text-align: center; font-size: 8px; }
          .signature-line { border-top: 1px solid #000; margin-top: 30px; padding-top: 3px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : '<span style="font-weight:bold;font-size:10px;">IEC</span>'}
          </div>
          <div class="company-info">
            <div class="company-name">Iqbal Electronics Co. WLL</div>
            <div class="company-details">Mobile Phones & Accessories | Electronics</div>
          </div>
          <div class="receipt-title">
            <h1>PAYMENT RECEIPT</h1>
            <div>Receipt #${payment.id}</div>
          </div>
        </div>
        <div class="content">
          <div class="info-section">
            <div class="info-box">
              <h3>Received From</h3>
              <div class="info-row"><span class="info-label">Customer:</span> ${customerName}</div>
              ${customerPhone ? `<div class="info-row"><span class="info-label">Phone:</span> ${customerPhone}</div>` : ""}
              <div class="info-row"><span class="info-label">Location:</span> Kuwait</div>
            </div>
            <div class="info-box">
              <h3>Receipt Details</h3>
              <div class="info-row"><span class="info-label">Receipt No:</span> ${payment.id}</div>
              <div class="info-row"><span class="info-label">Date:</span> ${receiptDate}</div>
              ${payment.notes ? `<div class="info-row"><span class="info-label">Notes:</span> ${payment.notes}</div>` : ""}
            </div>
          </div>
          
          <div class="amount-words">${amountWords} Only</div>
          
          <table>
            <thead>
              <tr>
                <th>Payment Mode</th>
                <th style="width:100px;text-align:right;">Amount (KWD)</th>
              </tr>
            </thead>
            <tbody>
              ${paymentModeHtml}
            </tbody>
          </table>
          
          <div class="totals-section">
            <div class="totals-box">
              <div class="totals-row"><span>Previous Balance:</span><span>${previousBalance.toFixed(3)} KWD</span></div>
              <div class="totals-row"><span>Amount Received:</span><span>${amountNum.toFixed(3)} KWD</span></div>
              <div class="totals-row total"><span>Current Balance:</span><span>${currentBalance.toFixed(3)} KWD</span></div>
            </div>
          </div>
          
          <div class="footer">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;padding-top:10px;border-top:1px solid #000;">
              <div style="font-size:8px;color:#666;flex:1;">
                This is a computer generated document.<br/>
                No signature required. Validate by scanning QR code.
              </div>
              ${qrDataUrl ? `
              <div style="text-align:center;">
                <img src="${qrDataUrl}" alt="QR Code" style="width:50px;height:50px;" />
                <div style="font-size:7px;margin-top:2px;">Scan to verify</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintPayment = (payment: PaymentWithDetails) => {
    if (userPrinterType === "a5") {
      handlePrintPaymentA5(payment);
    } else {
      handlePrintPaymentThermal(payment);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Receive Payment from Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger data-testid="select-customer" autoFocus>
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
                {customerId && customerBalance && (
                  <div className="text-sm font-medium mt-1">
                    Previous Balance:{" "}
                    <span className={customerBalance.balance > 0 ? "text-red-600" : "text-emerald-600"} data-testid="text-customer-balance">
                      KWD {customerBalance.balance.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  data-testid="input-payment-date"
                />
              </div>

              {!splitEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                    <SelectTrigger data-testid="select-payment-type">
                      <SelectValue placeholder="Select type" />
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
            
            {/* Cheque Details Section - Only shown when payment type is Cheque */}
            {!splitEnabled && paymentType === "Cheque" && (
              <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950/30 space-y-4">
                <Label className="text-base font-semibold text-amber-800 dark:text-amber-200">Cheque Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chequeNumber">Cheque Number *</Label>
                    <Input
                      id="chequeNumber"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="Enter cheque number"
                      data-testid="input-cheque-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chequeBankName">Bank Name *</Label>
                    <Input
                      id="chequeBankName"
                      value={chequeBankName}
                      onChange={(e) => setChequeBankName(e.target.value)}
                      placeholder="Enter bank name"
                      data-testid="input-cheque-bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chequeDate">Cheque Date *</Label>
                    <Input
                      id="chequeDate"
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      data-testid="input-cheque-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chequeDrawerName">Drawer Name</Label>
                    <Input
                      id="chequeDrawerName"
                      value={chequeDrawerName}
                      onChange={(e) => setChequeDrawerName(e.target.value)}
                      placeholder="Name on cheque (optional)"
                      data-testid="input-cheque-drawer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chequeNotes">Cheque Notes</Label>
                  <Input
                    id="chequeNotes"
                    value={chequeNotes}
                    onChange={(e) => setChequeNotes(e.target.value)}
                    placeholder="Additional notes about this cheque (optional)"
                    data-testid="input-cheque-notes"
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
              <div className="flex">
                <Button 
                  type="submit" 
                  disabled={createPaymentMutation.isPending}
                  onClick={() => {
                    setShouldPrintAfterSave(true);
                    setPrintTypeAfterSave(userPrinterType === "a5" ? "a5" : "thermal");
                  }}
                  className="rounded-r-none border-r-0"
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
                      Save & Print ({userPrinterType === "a5" ? "A5" : "Thermal"})
                    </>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      type="button"
                      disabled={createPaymentMutation.isPending}
                      className="rounded-l-none px-2"
                      data-testid="button-print-dropdown"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        if (userPrinterType !== "a5") updatePrinterMutation.mutate("a5");
                        setPrintTypeAfterSave("a5");
                        setShouldPrintAfterSave(true);
                        const form = document.querySelector("form");
                        form?.requestSubmit();
                      }}
                      data-testid="menu-save-print-a5"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      A5
                      {userPrinterType === "a5" && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                    </DropdownMenuItem>
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                placeholder="Search by customer, reference..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-search-payments"
              />
            </div>
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
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowDownLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments received yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-left py-3 px-2 font-medium">Customer</th>
                      <th className="text-left py-3 px-2 font-medium">Type</th>
                      <th className="text-right py-3 px-2 font-medium">Amount (KWD)</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-b hover-elevate">
                        <td className="py-3 px-2">{formatDate(payment.paymentDate)}</td>
                        <td className="py-3 px-2">{payment.customer?.name || "-"}</td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className={getPaymentTypeColor(payment.paymentType)}>
                            {payment.paymentType}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-emerald-600">
                          +{parseFloat(payment.amount).toFixed(3)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelectedPayment(payment)}
                              data-testid={`button-view-payment-${payment.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handlePrintPayment(payment)}
                              data-testid={`button-print-payment-${payment.id}`}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleWhatsAppSend(payment)}
                              data-testid={`button-whatsapp-payment-${payment.id}`}
                            >
                              <SiWhatsapp className="h-4 w-4" />
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
                    <tr className="border-t-2">
                      <td colSpan={3} className="py-3 px-2 font-bold">Total Received</td>
                      <td className="py-3 px-2 text-right font-bold text-emerald-600">
                        +{totalReceived.toFixed(3)} KWD
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Payment received from customer</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{formatDate(selectedPayment.paymentDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedPayment.customer?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Type</Label>
                  <p className="font-medium">{selectedPayment.paymentType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-medium text-emerald-600">+{parseFloat(selectedPayment.amount).toFixed(3)} KWD</p>
                </div>
              </div>
              {selectedPayment.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p>{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>Close</Button>
            {selectedPayment && (
              <Button onClick={() => handlePrintPayment(selectedPayment)}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment of {paymentToDelete?.amount} KWD? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Receipt via WhatsApp</DialogTitle>
            <DialogDescription>
              Enter the customer's phone number to send the payment receipt
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                placeholder="e.g., 96550001234"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>Cancel</Button>
            <Button onClick={handleSendWhatsApp} disabled={sendWhatsAppMutation.isPending}>
              {sendWhatsAppMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
