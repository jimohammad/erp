// @ts-ignore - qrcode types may not be fully compatible
import QRCode from 'qrcode';
import { apiRequest } from './queryClient';

export interface QRCodeData {
  type: 'SALE' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'RETURN' | 'PURCHASE';
  id?: number;
  number: string;
  amount: string;
  date: string;
  partyName?: string;
  partyType?: 'customer' | 'supplier';
}

export interface VerificationRecord {
  id: number;
  documentType: string;
  documentId: number;
  documentNumber: string;
  verificationCode: string;
  amount: string;
  documentDate: string;
  partyName: string | null;
  partyType: string | null;
}

async function createVerificationRecord(data: QRCodeData): Promise<VerificationRecord | null> {
  try {
    const response = await apiRequest('POST', '/api/verification/create', {
      documentType: data.type,
      documentId: data.id,
      documentNumber: data.number,
      amount: data.amount,
      documentDate: data.date,
      partyName: data.partyName || null,
      partyType: data.partyType || null,
    });
    return response.json();
  } catch (error) {
    console.error('Failed to create verification record:', error);
    return null;
  }
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export async function generateQRCodeDataURL(data: QRCodeData): Promise<string> {
  let qrContent: string;
  
  if (data.id) {
    const verification = await createVerificationRecord(data);
    if (verification?.verificationCode) {
      qrContent = `${getBaseUrl()}/verify/${verification.verificationCode}`;
    } else {
      qrContent = `${data.type}|${data.number}|${data.amount}|${data.date}`;
    }
  } else {
    qrContent = `${data.type}|${data.number}|${data.amount}|${data.date}`;
  }
  
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
