// @ts-ignore - qrcode types may not be fully compatible
import QRCode from 'qrcode';

export interface QRCodeData {
  type: 'SALE' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'RETURN' | 'PURCHASE';
  id?: number;
  number: string;
  amount: string;
  date: string;
  partyName?: string;
  partyType?: 'customer' | 'supplier';
}

function getDocumentTypeName(type: string): string {
  switch (type) {
    case 'SALE': return 'Sales Invoice';
    case 'PAYMENT_IN': return 'Payment Receipt';
    case 'PAYMENT_OUT': return 'Payment Voucher';
    case 'RETURN': return 'Return Note';
    case 'PURCHASE': return 'Purchase Order';
    default: return 'Document';
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

export async function generateQRCodeDataURL(data: QRCodeData): Promise<string> {
  // Create a well-formatted verification message
  const docType = getDocumentTypeName(data.type);
  const formattedDate = formatDate(data.date);
  const partyLabel = data.partyType === 'supplier' ? 'Supplier' : 'Customer';
  
  let qrContent = `IQBAL ELECTRONICS CO. WLL
Document Verification

${docType}
No: ${data.number}
Date: ${formattedDate}
Amount: KWD ${data.amount}`;

  if (data.partyName) {
    qrContent += `
${partyLabel}: ${data.partyName}`;
  }

  qrContent += `

This document is authentic.`;
  
  try {
    const dataUrl = await QRCode.toDataURL(qrContent, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return '';
  }
}

export function getQRCodeHtml(qrDataUrl: string, position: 'bottom' | 'right' = 'bottom'): string {
  if (!qrDataUrl) return '';
  
  if (position === 'bottom') {
    return `
      <div style="text-align:center;margin-top:15px;padding-top:10px;border-top:1px dashed #000;">
        <img src="${qrDataUrl}" alt="QR Code" style="width:70px;height:70px;" />
        <div style="font-size:8px;margin-top:3px;">Scan to verify document</div>
      </div>
    `;
  }
  
  return `
    <div style="text-align:center;">
      <img src="${qrDataUrl}" alt="QR Code" style="width:70px;height:70px;" />
      <div style="font-size:7px;margin-top:2px;">Scan to verify</div>
    </div>
  `;
}
