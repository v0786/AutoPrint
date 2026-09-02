/**
 * Document rendering templates & formatters for AutoPrint receipts, 4x6 labels, and invoices.
 */

import { ReceiptData, LabelData, InvoiceData, ReportData } from '../types/printer';

export interface EmbeddedVerificationContext {
  verificationCode?: string;
  formattedVerificationCode?: string;
  securityChecksum?: string;
  paymentStatus?: string;
  customerName?: string;
}

/**
 * Generates an embedded tamper-evident security verification footer block.
 * Sits on the final page / bottom edge of printed documents for staff counter verification.
 */
export function renderEmbeddedVerificationFooter(
  context?: EmbeddedVerificationContext,
  styleMode: 'receipt' | 'label' | 'standard_page' = 'receipt'
): string {
  if (!context?.verificationCode) {
    return '';
  }

  const code = context.verificationCode;
  const formatted = context.formattedVerificationCode || `${code.slice(0, 4)} ${code.slice(4)}`;
  const checksum = context.securityChecksum || 'SEC-VALID';
  const isPaid = context.paymentStatus === 'UPI_SUCCESS' || context.paymentStatus === 'CASH_COLLECTED';
  const isLocked = context.paymentStatus === 'CASH_LOCKED';

  const statusBadgeText = isPaid
    ? '✓ UPI PAID (VALIDATED)'
    : isLocked
    ? '⚠️ CASH LOCKED (DIGITAL FAILED)'
    : '⏳ PAYMENT REQUIRED AT COUNTER';

  const statusColor = isPaid ? '#15803d' : isLocked ? '#b91c1c' : '#b45309';

  if (styleMode === 'receipt') {
    return `
      <div style="margin-top: 14px; padding-top: 10px; border-top: 2px dashed #000; text-align: center; font-family: 'JetBrains Mono', monospace;">
        <div style="font-size: 8px; font-weight: 800; letter-spacing: 1px; color: #444; margin-bottom: 2px;">
          --- AUTOPRINT COLLECTION KEY ---
        </div>
        <div style="font-size: 14px; font-weight: 900; letter-spacing: 2px; padding: 4px 6px; background: #f1f5f9; border: 1px solid #000; display: inline-block; margin: 4px 0;">
          CODE: ${formatted}
        </div>
        <div style="font-size: 8px; font-weight: 700; color: ${statusColor}; margin-top: 2px;">
          STATUS: ${statusBadgeText}
        </div>
        <div style="font-size: 7px; color: #666; margin-top: 2px;">
          Security Checksum: ${checksum} | Show code at tray desk
        </div>
      </div>
    `;
  }

  if (styleMode === 'label') {
    return `
      <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #000; display: flex; justify-content: space-between; align-items: center; font-size: 9px; font-family: 'JetBrains Mono', monospace;">
        <div>
          <span style="font-weight: 800;">VERIFICATION: </span>
          <span style="font-weight: 900; background: #000; color: #fff; padding: 1px 4px; border-radius: 2px;">${formatted}</span>
        </div>
        <div style="font-size: 8px; font-weight: 700; color: #000;">
          ${checksum}
        </div>
      </div>
    `;
  }

  // Standard Page (Invoice / Report / A4)
  return `
    <div style="margin-top: 24px; padding: 12px 16px; background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 6px; font-family: 'JetBrains Mono', monospace; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;">
          AutoPrint Fail-Safe Collection Key (Last Page Embed)
        </div>
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
          <div style="font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: 2px; font-family: 'JetBrains Mono', monospace;">
            ${formatted}
          </div>
          <span style="font-size: 10px; font-weight: 700; color: #fff; background: ${statusColor}; padding: 2px 8px; border-radius: 4px;">
            ${statusBadgeText}
          </span>
        </div>
      </div>
      <div style="text-align: right; font-size: 10px; color: #475569;">
        <div style="font-weight: 700;">Checksum: ${checksum}</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Present this 8-digit code at staff collection desk</div>
      </div>
    </div>
  `;
}

/**
 * Generates an 80mm or 58mm Thermal AutoPrint Receipt HTML
 */
export function renderReceiptHtml(
  data: ReceiptData,
  format: '80mm' | '58mm' = '80mm',
  verification?: EmbeddedVerificationContext
): string {
  const widthPx = format === '58mm' ? '220px' : '300px';

  const itemsHtml = data.items
    .map(
      (item) => `
      <div style="margin-bottom: 6px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; font-weight: 600;">
          <span>${item.qty}x ${item.name}</span>
          <span>$${(item.qty * item.unitPrice).toFixed(2)}</span>
        </div>
        ${
          item.options
            ? `<div style="font-size: 11px; color: #555; padding-left: 12px;">+ ${item.options}</div>`
            : ''
        }
      </div>
    `
    )
    .join('');

  return `
    <div style="width: ${widthPx}; font-family: 'JetBrains Mono', 'Courier New', monospace; color: #000; background: #fff; padding: 12px; margin: 0 auto; line-height: 1.4;">
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
        <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px;">${data.merchantName}</div>
        <div style="font-size: 11px; margin-top: 2px;">${data.storeAddress}</div>
        <div style="font-size: 11px;">Tel: ${data.phone} | Tax ID: ${data.taxId}</div>
      </div>

      <div style="font-size: 11px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Order: <strong>${data.orderNumber}</strong></span>
          <span>${data.orderType}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Cashier: ${data.cashier}</span>
          <span>Reg: ${data.registerId}</span>
        </div>
        <div style="margin-top: 2px; color: #444;">${data.date}</div>
      </div>

      <div style="margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
        ${itemsHtml}
      </div>

      <div style="font-size: 12px; margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>Subtotal:</span>
          <span>$${data.subtotal.toFixed(2)}</span>
        </div>
        ${
          data.discount > 0
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: #666;">
                <span>Discount:</span>
                <span>-$${data.discount.toFixed(2)}</span>
              </div>`
            : ''
        }
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>Sales Tax (10%):</span>
          <span>$${data.tax.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; margin-top: 6px; border-top: 1px solid #000; padding-top: 4px;">
          <span>TOTAL:</span>
          <span>$${data.total.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; color: #444;">
          <span>Paid via ${data.paymentMethod}:</span>
          <span>${data.cardLast4 ? `**** ${data.cardLast4}` : `$${data.total.toFixed(2)}`}</span>
        </div>
      </div>

      <div style="text-align: center; margin-top: 12px;">
        <div style="font-size: 11px; margin-bottom: 8px; font-weight: 500;">${data.footerMessage}</div>
        <!-- Barcode simulation -->
        <div style="background: #000; color: #fff; padding: 6px; display: inline-block; font-size: 11px; letter-spacing: 4px; font-weight: bold; border-radius: 2px;">
          *${data.barcodeValue}*
        </div>
        <div style="font-size: 9px; margin-top: 4px; color: #666;">Scan receipt for digital copy or return</div>
        ${data.autoCut ? '<div style="margin-top: 10px; font-size: 10px; color: #999;">-- [ESC/POS AUTO-CUT COMMAND] --</div>' : ''}
        ${renderEmbeddedVerificationFooter(verification, 'receipt')}
      </div>
    </div>
  `;
}

/**
 * Generates a 4x6 Shipping Label HTML
 */
export function renderLabelHtml(data: LabelData, verification?: EmbeddedVerificationContext): string {
  return `
    <div style="width: 384px; height: 576px; box-sizing: border-box; border: 3px solid #000; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fff; color: #000; padding: 16px; margin: 0 auto; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <!-- Top header bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px;">
          <div>
            <div style="font-size: 18px; font-weight: 800; letter-spacing: -0.5px;">PRIORITY EXPRESS</div>
            <div style="font-size: 10px; font-weight: 600;">TRACKED & INSURED DISPATCH</div>
          </div>
          <div style="border: 2px solid #000; padding: 4px 8px; font-size: 14px; font-weight: 900;">
            ${data.weightLbs} LBS
          </div>
        </div>

        <!-- Sender / Return Address -->
        <div style="font-size: 10px; line-height: 1.3; border-bottom: 1px solid #000; padding-bottom: 6px; margin-bottom: 8px; color: #333;">
          <div style="font-weight: 700;">FROM:</div>
          <div>${data.sender.name} - ${data.sender.company}</div>
          <div>${data.sender.street}</div>
          <div>${data.sender.cityStateZip}</div>
        </div>

        <!-- Recipient Address (Large) -->
        <div style="padding: 10px; border: 2px solid #000; background: #f8fafc; border-radius: 4px; margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">SHIP TO:</div>
          <div style="font-size: 16px; font-weight: 800; margin-top: 2px;">${data.recipient.name}</div>
          ${data.recipient.company ? `<div style="font-size: 13px; font-weight: 600;">${data.recipient.company}</div>` : ''}
          <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">${data.recipient.street}</div>
          <div style="font-size: 15px; font-weight: 900; margin-top: 2px;">${data.recipient.cityStateZip}</div>
          ${data.recipient.phone ? `<div style="font-size: 11px; margin-top: 3px; color: #475569;">Tel: ${data.recipient.phone}</div>` : ''}
        </div>

        <!-- Package Meta & SKU -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 8px;">
          <div style="border: 1px solid #000; padding: 4px 6px;">
            <div style="font-size: 9px; color: #666;">ITEM / SKU</div>
            <div style="font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${data.sku}</div>
          </div>
          <div style="border: 1px solid #000; padding: 4px 6px;">
            <div style="font-size: 9px; color: #666;">PACKAGE TYPE</div>
            <div style="font-weight: 700;">${data.packageType}</div>
          </div>
        </div>
      </div>

      <!-- Bottom Barcode & Tracking section -->
      <div style="border-top: 2px solid #000; padding-top: 10px; text-align: center;">
        <div style="font-size: 10px; font-weight: 700; margin-bottom: 4px;">USPS / CARRIER TRACKING #</div>
        <!-- Barcode lines representation -->
        <div style="display: flex; justify-content: center; align-items: flex-end; height: 52px; gap: 2px; margin-bottom: 6px; padding: 0 10px;">
          ${Array.from({ length: 48 })
            .map((_, i) => {
              const height = (i * 17) % 35 + 20;
              const width = i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1;
              return `<div style="width: ${width}px; height: ${height}px; background: #000;"></div>`;
            })
            .join('')}
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 800; letter-spacing: 2px;">
          ${data.trackingNumber}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #666; margin-top: 6px;">
          <span>BATCH: ${data.batchNumber || 'N/A'}</span>
          <span>${data.fragile ? '⚠️ FRAGILE - HANDLE WITH CARE' : 'STANDARD CARGO'}</span>
        </div>
        ${renderEmbeddedVerificationFooter(verification, 'label')}
      </div>
    </div>
  `;
}

/**
 * Generates an A4 / Letter Tax Invoice HTML
 */
export function renderInvoiceHtml(data: InvoiceData, verification?: EmbeddedVerificationContext): string {
  const rows = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-size: 13px;">${item.description}</td>
        <td style="padding: 10px; font-size: 13px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; font-size: 13px; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 10px; font-size: 13px; text-align: right; font-weight: 600;">$${item.amount.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="max-width: 720px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #1e293b; background: #fff; padding: 32px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">BLUE HARBOR ENTERPRISES</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Merchant Retail & Logistics Solutions</div>
          <div style="font-size: 13px; color: #64748b;">support@blueharbor.local | (206) 555-0194</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 28px; font-weight: 900; color: #0284c7;">INVOICE</div>
          <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">${data.invoiceNumber}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Issue Date: ${data.issueDate}</div>
          <div style="font-size: 12px; color: #ef4444; font-weight: 600;">Due Date: ${data.dueDate}</div>
        </div>
      </div>

      <!-- Bill To -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
        <div style="background: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">BILLED TO:</div>
          <div style="font-size: 16px; font-weight: 700; margin-top: 4px;">${data.clientName}</div>
          <div style="font-size: 13px; color: #334155;">${data.clientCompany}</div>
          <div style="font-size: 13px; color: #334155; margin-top: 2px;">${data.billingAddress}</div>
          <div style="font-size: 13px; color: #0284c7; margin-top: 2px;">${data.clientEmail}</div>
        </div>
        <div style="background: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">PAYMENT TERMS:</div>
          <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">${data.paymentTerms}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Please remit payment via ACH Direct or Corporate Wire to Account #9948-29184-01.</div>
        </div>
      </div>

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #0f172a; color: #fff;">
            <th style="padding: 10px; text-align: left; font-size: 12px; border-top-left-radius: 4px;">DESCRIPTION</th>
            <th style="padding: 10px; text-align: center; font-size: 12px; width: 60px;">QTY</th>
            <th style="padding: 10px; text-align: right; font-size: 12px; width: 100px;">UNIT PRICE</th>
            <th style="padding: 10px; text-align: right; font-size: 12px; width: 110px; border-top-right-radius: 4px;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Summary -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 28px;">
        <div style="width: 260px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748b;">Subtotal:</span>
            <span style="font-weight: 600;">$${data.subtotal.toFixed(2)}</span>
          </div>
          ${
            data.discountAmount > 0
              ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #16a34a;">
                  <span>Discount:</span>
                  <span>-$${data.discountAmount.toFixed(2)}</span>
                </div>`
              : ''
          }
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748b;">Sales Tax (${data.taxRatePercent}%):</span>
            <span style="font-weight: 600;">$${data.taxAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 8px;">
            <span>GRAND TOTAL:</span>
            <span style="color: #0284c7;">$${data.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Notes & Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #64748b; line-height: 1.5;">
        <div style="font-weight: 700; color: #334155; margin-bottom: 2px;">NOTES / TERMS:</div>
        <div>${data.notes || 'All merchandise subject to standard merchant guarantee. Questions regarding this invoice should be directed to billing@blueharbor.local.'}</div>
      </div>

      ${renderEmbeddedVerificationFooter(verification, 'standard_page')}
    </div>
  `;
}

/**
 * Generates an End-of-Day or Spooler Diagnostics Report HTML
 */
export function renderReportHtml(data: ReportData, verification?: EmbeddedVerificationContext): string {
  const metricCards = data.summaryMetrics
    .map(
      (m) => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
        <div style="font-size: 11px; color: #64748b; font-weight: 600;">${m.label}</div>
        <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px;">${m.value}</div>
        ${m.change ? `<div style="font-size: 10px; color: #16a34a; font-weight: 600; margin-top: 2px;">${m.change}</div>` : ''}
      </div>
    `
    )
    .join('');

  const rows = data.breakdown
    .map(
      (b) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-size: 12px;">${b.category}</td>
        <td style="padding: 8px 12px; font-size: 12px; text-align: center;">${b.count}</td>
        <td style="padding: 8px 12px; font-size: 12px; text-align: right; font-weight: 600;">${b.volume}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="max-width: 680px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #1e293b; background: #fff; padding: 24px; margin: 0 auto;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${data.title}</div>
          <div style="font-size: 12px; color: #64748b;">${data.merchantName} | Period: ${data.period}</div>
        </div>
        <div style="font-size: 11px; color: #64748b; text-align: right;">
          <div>Generated: ${data.generatedAt}</div>
          <div>Agent: ${data.generatedBy}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
        ${metricCards}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f1f5f9; color: #334155;">
            <th style="padding: 8px 12px; text-align: left; font-size: 11px;">CATEGORY / ITEM</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 11px;">COUNT</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 11px;">METRIC / VALUE</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      ${renderEmbeddedVerificationFooter(verification, 'standard_page')}
    </div>
  `;
}
