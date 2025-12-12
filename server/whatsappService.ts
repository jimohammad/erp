import { SalesOrderWithDetails, PaymentWithDetails } from "@shared/schema";

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }
  
  if (!cleaned.startsWith("965") && cleaned.length === 8) {
    cleaned = "965" + cleaned;
  }
  
  return cleaned;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value: string | null, decimals: number): string {
  if (!value) return "—";
  return Number(value).toFixed(decimals);
}

export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return { success: false, error: "WhatsApp API not configured" };
  }

  const formattedPhone = formatPhoneNumber(to);
  
  if (formattedPhone.length < 10) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const error = data as WhatsAppError;
      console.error("WhatsApp API error:", error);
      return { 
        success: false, 
        error: error.error?.message || "Failed to send message" 
      };
    }

    const result = data as WhatsAppResponse;
    return { 
      success: true, 
      messageId: result.messages?.[0]?.id 
    };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Network error" 
    };
  }
}

export function buildSalesInvoiceMessage(order: SalesOrderWithDetails): string {
  const lineItemsText = order.lineItems
    .map((item, index) => {
      let text = `${index + 1}. ${item.itemName}\n   Qty: ${item.quantity} × ${formatNumber(item.priceKwd, 3)} KWD = ${formatNumber(item.totalKwd, 3)} KWD`;
      if (item.imeiNumbers && item.imeiNumbers.length > 0) {
        text += `\n   IMEI: ${item.imeiNumbers.join(", ")}`;
      }
      return text;
    })
    .join("\n\n");

  return `*SALES INVOICE*
Iqbal Electronics Co. WLL
━━━━━━━━━━━━━━━━━━

*Invoice No:* ${order.invoiceNumber || `INV-${order.id}`}
*Date:* ${formatDate(order.saleDate)}
*Customer:* ${order.customer?.name || "Walk-in Customer"}

*Items:*
${lineItemsText}

━━━━━━━━━━━━━━━━━━
*TOTAL: ${formatNumber(order.totalKwd, 3)} KWD*
━━━━━━━━━━━━━━━━━━

Thank you for your business!
Iqbal Electronics Co. WLL`;
}

export function buildPaymentReceiptMessage(payment: PaymentWithDetails): string {
  const partyName = payment.direction === "IN" 
    ? payment.customer?.name 
    : payment.supplier?.name;
  
  const partyType = payment.direction === "IN" ? "Customer" : "Supplier";
  const receiptType = payment.direction === "IN" ? "PAYMENT RECEIVED" : "PAYMENT MADE";

  return `*${receiptType}*
Iqbal Electronics Co. WLL
━━━━━━━━━━━━━━━━━━

*Receipt No:* ${payment.reference || `PMT-${payment.id}`}
*Date:* ${formatDate(payment.paymentDate)}
*${partyType}:* ${partyName || "—"}

*Payment Method:* ${payment.paymentType}
*Amount:* ${formatNumber(payment.amount, 3)} KWD

${payment.notes ? `*Notes:* ${payment.notes}\n` : ""}
━━━━━━━━━━━━━━━━━━

Thank you!
Iqbal Electronics Co. WLL`;
}

export function isWhatsAppConfigured(): boolean {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
}
