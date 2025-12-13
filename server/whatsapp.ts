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
 * Format phone number to WhatsApp format (with country code, no spaces/dashes)
 * Assumes Kuwait numbers if no country code provided
 */
function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // If it's a Kuwait number without country code (8 digits starting with certain prefixes)
  if (cleaned.length === 8 && /^[5-9]/.test(cleaned)) {
    cleaned = '965' + cleaned;
  }
  
  // If it's already a full international number
  if (cleaned.length >= 10) {
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
    
    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      const errorMessage = data.error?.message || "Failed to send message";
      return { success: false, error: errorMessage };
    }
    
    const messageId = data.messages?.[0]?.id;
    console.log("WhatsApp message sent successfully:", messageId);
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

export type { SaleDetails, WhatsAppMessageResult };
