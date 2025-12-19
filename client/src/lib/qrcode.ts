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

export async function generateQRCodeDataURL(data: QRCodeData): Promise<string> {
  // Simple QR code with document details - no database calls
  const qrContent = `${data.type}|${data.number}|${data.amount}|${data.date}`;
  
  try {
    const dataUrl = await QRCode.toDataURL(qrContent, {
      width: 80,
      margin: 1,
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
        <img src="${qrDataUrl}" alt="QR Code" style="width:60px;height:60px;" />
        <div style="font-size:8px;margin-top:3px;">Scan to verify</div>
      </div>
    `;
  }
  
  return `
    <div style="text-align:center;">
      <img src="${qrDataUrl}" alt="QR Code" style="width:60px;height:60px;" />
      <div style="font-size:7px;margin-top:2px;">Scan to verify</div>
    </div>
  `;
}
