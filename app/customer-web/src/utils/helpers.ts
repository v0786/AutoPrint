import { PrintOrder, ShopInfo } from '../types';

/**
 * Generates an 8-digit unique collection code formatted with a hyphen: "XXXX-XXXX"
 * e.g., "8492-1057"
 */
export function generateCollectionCode(): string {
  const part1 = Math.floor(1000 + Math.random() * 9000).toString();
  const part2 = Math.floor(1000 + Math.random() * 9000).toString();
  return `${part1}-${part2}`;
}

export function generateOrderId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'AP-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format bytes to readable string (e.g. 2.4 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parse custom page range like "1-3, 5, 7-9" given a total page count
 * Returns array of unique page numbers and validation status
 */
export function parseCustomPageRange(rangeStr: string, totalPages: number): {
  valid: boolean;
  pages: number[];
  error?: string;
} {
  const trimmed = rangeStr.trim();
  if (!trimmed) {
    return { valid: false, pages: [], error: 'Page range cannot be empty' };
  }

  const parts = trimmed.split(',');
  const pageSet = new Set<number>();

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        return { valid: false, pages: [], error: `Invalid range format: "${part}"` };
      }
      if (end > totalPages) {
        return {
          valid: false,
          pages: [],
          error: `Page ${end} exceeds total document pages (${totalPages})`,
        };
      }

      for (let i = start; i <= end; i++) {
        pageSet.add(i);
      }
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1) {
        return { valid: false, pages: [], error: `Invalid page number: "${part}"` };
      }
      if (page > totalPages) {
        return {
          valid: false,
          pages: [],
          error: `Page ${page} exceeds document length (${totalPages})`,
        };
      }
      pageSet.add(page);
    }
  }

  if (pageSet.size === 0) {
    return { valid: false, pages: [], error: 'No valid pages selected' };
  }

  return {
    valid: true,
    pages: Array.from(pageSet).sort((a, b) => a - b),
  };
}

/**
 * Uses Web Speech API to read the collection code aloud digit by digit
 */
export function speakCollectionCode(code: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  // Remove hyphen and separate digits for clear articulation
  const digits = code.replace(/[^0-9]/g, '').split('').join(' ');
  const textToSpeak = `Your AutoPrint collection code is: ${digits}`;

  window.speechSynthesis.cancel(); // Stop any pending utterances
  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.rate = 0.85; // Slightly slower for crisp clarity at noisy shop counter
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

/**
 * Generates and triggers automatic local download of structured receipt text file
 */
export function downloadReceipt(order: PrintOrder, shop: ShopInfo): void {
  if (typeof window === 'undefined') return;

  const lines = [
    '========================================',
    '       AUTOPRINT DIGITAL RECEIPT        ',
    '========================================',
    `Order ID        : ${order.orderId}`,
    `Collection Code : ${order.collectionCode}`,
    `Date & Time     : ${order.createdAt}`,
    '----------------------------------------',
    'PRINT SHOP DETAILS',
    `Shop Name       : ${shop.name}`,
    `Branch          : ${shop.branch}`,
    `Address         : ${shop.address}`,
    `Counter         : ${shop.kioskNumber}`,
    '----------------------------------------',
    'DOCUMENT SPECIFICATIONS',
    `Document Name   : ${order.file.name}`,
    `File Size       : ${formatBytes(order.file.size)}`,
    `Pages Selected  : ${order.specs.selectedPagesCount} of ${order.file.totalPages} pages`,
    `Number of Copies: ${order.specs.copies}`,
    `Color Mode      : ${order.specs.colorMode === 'bw' ? 'Grayscale (B&W)' : order.specs.colorMode === 'color' ? 'Full Color (CMYK)' : 'Photo Glossy'}`,
    `Sides           : ${order.specs.duplex === 'single' ? 'Single-Sided' : 'Double-Sided'}`,
    `Paper Size      : ${order.specs.paperSize.toUpperCase()}`,
    `Orientation     : ${order.specs.orientation.toUpperCase()}`,
    `Finishing       : ${order.specs.finishing === 'none' ? 'None' : order.specs.finishing.toUpperCase()}`,
    'BILLING & PAYMENT SUMMARY',
    `TOTAL AMOUNT    : Rs. ${order.pricing.totalAmount.toFixed(2)}`,
    `Payment Method  : ${order.payment.method === 'upi' ? `UPI (${order.payment.upiApp?.toUpperCase() || 'APP'})` : 'CASH AT SHOP COUNTER'}`,
    `Payment Status  : ${order.payment.paymentVerified ? (order.payment.method === 'cash' ? 'PAYMENT DUE IN CASH AT COUNTER' : 'PAID & VERIFIED (UPI)') : 'PENDING'}`,
    order.payment.transactionId ? `Transaction ID  : ${order.payment.transactionId}` : '',
    '----------------------------------------',
    'COLLECTION INSTRUCTIONS:',
    `1. Go to ${shop.name} counter`,
    `2. Verbally recite your 8-digit Collection Code: ${order.collectionCode}`,
    `3. ${order.payment.method === 'cash' ? `Pay Rs. ${order.pricing.totalAmount.toFixed(2)} in cash and collect your prints.` : 'Collect your prints instantly from the counter.'}`,
    '========================================',
    '     Thank you for using AutoPrint!     ',
    '========================================',
  ].filter(Boolean).join('\n');

  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Receipt-${order.orderId}-${order.collectionCode}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
