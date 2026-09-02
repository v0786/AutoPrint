/**
 * Shop Configuration & Fallback Types
 * Real shop data is dynamically loaded from backend /api/merchant/public-profile
 */

import { ShopInfo } from '../types';

export const DEFAULT_SHOP_ID = 'live';

export const DEFAULT_OFFLINE_SHOP: ShopInfo = {
  id: 'offline',
  name: 'No shop is selected',
  branch: 'Offline Counter',
  address: 'Shop is currently offline or unconfigured.',
  kioskNumber: 'Counter #00',
  status: 'offline',
  isMerchantConfigured: false,
  activePrinters: [],
  queueLength: 0,
  averageWaitMins: 0,
  rates: {
    bwSingle: 2.0,
    bwDoublePerSide: 1.5,
    colorSingle: 10.0,
    colorDoublePerSide: 8.0,
    photoGlossy: 25.0,
    a3Multiplier: 2.0,
    legalMultiplier: 1.25,
    letterMultiplier: 1.0,
    finishing: {
      staple: 5.0,
      spiral: 40.0,
      hardcover: 150.0,
      laminationPerSheet: 20.0,
    },
  },
  upiDetails: {
    vpa: '',
    payeeName: '',
  },
};

export const SHOPS_DATABASE: Record<string, ShopInfo> = {};

export function resolveShopFromUrl(): ShopInfo | null {
  return null;
}
