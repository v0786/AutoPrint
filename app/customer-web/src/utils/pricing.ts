import { PriceBreakdown, PrintSpecifications, ShopInfo } from '../types';
import { DEFAULT_OFFLINE_SHOP } from '../data/shops';

export function calculatePricing(
  specs: PrintSpecifications,
  shop: ShopInfo | null
): PriceBreakdown {
  const { colorMode, duplex, paperSize, copies, selectedPagesCount, finishing } = specs;
  const rates = shop?.rates || DEFAULT_OFFLINE_SHOP.rates;

  // Base rate per page side
  let ratePerPage = 0;
  if (colorMode === 'photo') {
    ratePerPage = rates.photoGlossy;
  } else if (colorMode === 'color') {
    ratePerPage = duplex === 'double' ? rates.colorDoublePerSide : rates.colorSingle;
  } else {
    // B&W
    ratePerPage = duplex === 'double' ? rates.bwDoublePerSide : rates.bwSingle;
  }

  // Paper Size Multiplier
  let paperMultiplier = 1.0;
  if (paperSize === 'a3') paperMultiplier = rates.a3Multiplier;
  else if (paperSize === 'legal') paperMultiplier = rates.legalMultiplier;
  else if (paperSize === 'letter') paperMultiplier = rates.letterMultiplier;

  // Effective physical sheets for paper calculation
  const totalPagesToPrint = Math.max(1, selectedPagesCount);
  const effectiveSheets = duplex === 'double' 
    ? Math.ceil(totalPagesToPrint / 2) 
    : totalPagesToPrint;

  // Page cost calculation
  const baseCostPerCopy = totalPagesToPrint * ratePerPage * paperMultiplier;
  const pageTotalCost = baseCostPerCopy * Math.max(1, copies);

  // Surcharges
  const paperSizeSurcharge = (paperMultiplier - 1.0) * totalPagesToPrint * ratePerPage * copies;

  // Finishing costs
  let finishingUnitCost = 0;
  if (finishing === 'staple') {
    finishingUnitCost = rates.finishing.staple;
  } else if (finishing === 'spiral') {
    finishingUnitCost = rates.finishing.spiral;
  } else if (finishing === 'hardcover') {
    finishingUnitCost = rates.finishing.hardcover;
  } else if (finishing === 'lamination') {
    finishingUnitCost = rates.finishing.laminationPerSheet * effectiveSheets;
  }

  const finishingCost = finishingUnitCost * Math.max(1, copies);

  const subtotal = Number((pageTotalCost + finishingCost).toFixed(2));
  const totalAmount = subtotal;

  return {
    ratePerPage: Number((ratePerPage * paperMultiplier).toFixed(2)),
    effectiveSheets,
    pageTotalCost: Number(pageTotalCost.toFixed(2)),
    paperSizeSurcharge: Number(paperSizeSurcharge.toFixed(2)),
    finishingCost: Number(finishingCost.toFixed(2)),
    subtotal,
    gstAmount: 0,
    totalAmount,
  };
}

