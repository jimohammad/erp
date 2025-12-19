/**
 * WhatsApp Business API Service
 * Sends transaction messages to customers via WhatsApp Cloud API
 */

// Phone Number ID from Meta Business Manager
const PHONE_NUMBER_ID = "931389683383196";
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SaleDetails {
  invoiceNumber: string | null;
  saleDate: string;
  totalKwd: string | null;
  customerName: string;
  items: Array<{
    itemName: string;
    quantity: number;
    priceKwd: string | null;
    imeiNumbers?: string[] | null;
  }>;
}

/**
 * Format phone number to WhatsApp format (E.164 format: country code + number, no + sign)
 * Assumes Kuwait numbers if no country code provided
 * Kuwait mobile: 8 digits starting with 5, 6, 9
 * Kuwait landline: 8 digits starting with 2
 */
function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters (including + sign)
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 00, remove that prefix (international dialing format)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // If it's a Kuwait number without country code (8 digits)
  // Mobile: starts with 5, 6, 9
  // Landline: starts with 2
  if (cleaned.length === 8 && /^[2569]/.test(cleaned)) {
    cleaned = '965' + cleaned;
  }
  
  // If already has Kuwait country code (965) + 8 digits = 11 digits
  if (cleaned.startsWith('965') && cleaned.length === 11) {
    return cleaned;
  }
  
  // Accept any valid international number (10+ digits with country code)
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return cleaned;
  }
  
  return null;
}

/**
 * Build the transaction message text
 */
function buildSaleMessage(sale: SaleDetails): string {
  const lines: string[] = [];
  
  lines.push(`*Iqbal Electronics Co. WLL*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(``);
  lines.push(`Thank you for your purchase, ${sale.customerName}!`);
  lines.push(``);
  
  if (sale.invoiceNumber) {
    lines.push(`*Invoice:* #${sale.invoiceNumber}`);
  }
  lines.push(`*Date:* ${sale.saleDate}`);
  lines.push(``);
  
  lines.push(`*Items:*`);
  for (const item of sale.items) {
    const qty = item.quantity || 1;
    const price = item.priceKwd ? `${parseFloat(item.priceKwd).toFixed(3)} KWD` : '';
    lines.push(`• ${item.itemName} (x${qty}) ${price}`);
    
    // Include IMEI if available (first one only to keep message short)
    if (item.imeiNumbers && item.imeiNumbers.length > 0) {
      lines.push(`  IMEI: ${item.imeiNumbers[0]}`);
    }
  }
  
  lines.push(``);
  if (sale.totalKwd) {
    lines.push(`*Total:* ${parseFloat(sale.totalKwd).toFixed(3)} KWD`);
  }
  
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`For any queries, please contact us.`);
  
  return lines.join('\n');
}

/**
 * Send a WhatsApp text message to a customer
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<WhatsAppMessageResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error("WhatsApp: WHATSAPP_ACCESS_TOKEN not configured");
    return { success: false, error: "WhatsApp access token not configured" };
  }
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  if (!formattedPhone) {
    console.error("WhatsApp: Invalid phone number format:", phoneNumber);
    return { success: false, error: "Invalid phone number format" };
  }
  
  try {
    console.log(`[WhatsApp] Sending message to: ${formattedPhone}`);
    
    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
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
    });
    
    const data = await response.json();
    console.log(`[WhatsApp] API Response status: ${response.status}, data:`, JSON.stringify(data));
    
    if (!response.ok) {
      console.error("[WhatsApp] API error:", data);
      const errorMessage = data.error?.message || "Failed to send message";
      return { success: false, error: errorMessage };
    }
    
    const messageId = data.messages?.[0]?.id;
    const messageStatus = data.messages?.[0]?.message_status;
    console.log(`[WhatsApp] Message sent successfully. ID: ${messageId}, Status: ${messageStatus}`);
    return { success: true, messageId };
    
  } catch (error) {
    console.error("WhatsApp: Network error:", error);
    return { success: false, error: "Network error sending WhatsApp message" };
  }
}

/**
 * Send sale transaction notification to customer via WhatsApp
 */
export async function sendSaleNotification(
  customerPhone: string,
  saleDetails: SaleDetails
): Promise<WhatsAppMessageResult> {
  const message = buildSaleMessage(saleDetails);
  return sendWhatsAppMessage(customerPhone, message);
}

/**
 * Build a formatted sales invoice message for WhatsApp
 */
export function buildSalesInvoiceMessage(order: {
  id: number;
  invoiceNumber?: string | null;
  saleDate?: string | null;
  totalKwd?: string | null;
  customer?: { name: string } | null;
  lineItems: Array<{
    itemName: string;
    quantity: number | null;
    priceKwd?: string | null;
    totalKwd?: string | null;
    imeiNumbers?: string[] | null;
  }>;
}): string {
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatNumber = (value: string | null | undefined, decimals: number): string => {
    if (!value) return "—";
    return Number(value).toFixed(decimals);
  };

  const lineItemsText = order.lineItems
    .map((item, index) => {
      let text = `${index + 1}. ${item.itemName}\n   Qty: ${item.quantity ?? 1} × ${formatNumber(item.priceKwd, 3)} KWD = ${formatNumber(item.totalKwd, 3)} KWD`;
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

/**
 * Build a formatted payment receipt message for WhatsApp
 */
export function buildPaymentReceiptMessage(payment: {
  id: number;
  reference?: string | null;
  paymentDate?: string | null;
  direction: string;
  paymentType: string;
  amount: string;
  notes?: string | null;
  customer?: { name: string } | null;
  supplier?: { name: string } | null;
}): string {
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatNumber = (value: string | null | undefined, decimals: number): string => {
    if (!value) return "—";
    return Number(value).toFixed(decimals);
  };

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

${payment.notes ? `*Notes:* ${payment.notes}\n` : ""}━━━━━━━━━━━━━━━━━━

Thank you!
Iqbal Electronics Co. WLL`;
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!process.env.WHATSAPP_ACCESS_TOKEN;
}

export type { SaleDetails, WhatsAppMessageResult };
