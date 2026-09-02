import { PricingSettings, PrintPreferences, PricingBreakdown } from '../types';

export function calculatePricing(
  pageCount: number,
  preferences: PrintPreferences,
  settings: PricingSettings
): PricingBreakdown {
  let effectivePagesPerCopy = pageCount;
  if (preferences.pageRange && preferences.pageRange.toLowerCase() !== 'all') {
    const parsed = parsePageRange(preferences.pageRange, pageCount);
    if (parsed > 0) {
      effectivePagesPerCopy = parsed;
    }
  }

  const copies = Math.max(1, preferences.copies || 1);
  const totalRawPages = effectivePagesPerCopy * copies;

  const basePagePrice = preferences.colorMode === 'color'
    ? settings.colorPricePerPage
    : settings.bwPricePerPage;

  let sizeMultiplier = 1.0;
  if (preferences.paperSize === 'A3') sizeMultiplier = settings.a3Multiplier;
  else if (preferences.paperSize === 'Legal') sizeMultiplier = settings.legalMultiplier;

  const adjustedPagePrice = basePagePrice * sizeMultiplier;
  const subtotal = totalRawPages * adjustedPagePrice;

  const finishSurchargePerSheet = settings.paperFinishPrices[preferences.paperFinish] || 0;
  const isDuplex = preferences.sidedness.startsWith('double');
  const sheetsCount = isDuplex ? Math.ceil(totalRawPages / 2) : totalRawPages;
  const finishSurcharge = sheetsCount * finishSurchargePerSheet;

  const bindingPerCopy = settings.bindingPrices[preferences.binding] || 0;
  const bindingSurcharge = bindingPerCopy * copies;

  let duplexDiscount = 0;
  if (isDuplex && settings.duplexDiscountPercent > 0) {
    duplexDiscount = (subtotal * settings.duplexDiscountPercent) / 100;
  }

  let bulkDiscount = 0;
  const applicableBulk = [...settings.bulkDiscounts]
    .sort((a, b) => b.minPages - a.minPages)
    .find(tier => totalRawPages >= tier.minPages);

  if (applicableBulk) {
    bulkDiscount = ((subtotal + finishSurcharge) * applicableBulk.discountPercent) / 100;
  }

  const preTax = Math.max(0, subtotal + finishSurcharge + bindingSurcharge - duplexDiscount - bulkDiscount);
  const tax = (preTax * settings.taxRatePercent) / 100;
  const total = Number((preTax + tax).toFixed(2));

  return {
    basePagePrice: adjustedPagePrice,
    totalPages: totalRawPages,
    subtotal: Number(subtotal.toFixed(2)),
    colorSurcharge: preferences.colorMode === 'color' ? Number((subtotal - (totalRawPages * settings.bwPricePerPage)).toFixed(2)) : 0,
    finishSurcharge: Number(finishSurcharge.toFixed(2)),
    bindingSurcharge: Number(bindingSurcharge.toFixed(2)),
    duplexDiscount: Number(duplexDiscount.toFixed(2)),
    bulkDiscount: Number(bulkDiscount.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total,
  };
}

export function parsePageRange(rangeStr: string, totalPages: number): number {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') return totalPages;

  try {
    const pageSet = new Set<number>();
    const parts = rangeStr.split(',');

    for (const part of parts) {
      const clean = part.trim();
      if (clean.includes('-')) {
        const [startStr, endStr] = clean.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, totalPages));
          const e = Math.max(s, Math.min(end, totalPages));
          for (let i = s; i <= e; i++) {
            pageSet.add(i);
          }
        }
      } else {
        const p = parseInt(clean, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          pageSet.add(p);
        }
      }
    }

    return pageSet.size > 0 ? pageSet.size : totalPages;
  } catch {
    return totalPages;
  }
}
