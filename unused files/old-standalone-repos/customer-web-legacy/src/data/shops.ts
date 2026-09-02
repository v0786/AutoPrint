import { ShopInfo } from '../types';

export const SHOPS_DATABASE: Record<string, ShopInfo> = {
  'campus-hub': {
    id: 'campus-hub',
    name: 'Apex Cyber Hub & Print Express',
    branch: 'North University Gate',
    address: 'Shop 12, Student Activity Arcade, MG Road Campus',
    kioskNumber: 'Counter #01',
    status: 'online',
    activePrinters: ['HP PageWide Enterprise 586', 'Canon imageRUNNER 2625'],
    queueLength: 1,
    averageWaitMins: 2,
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
      vpa: 'autoprint.apex@icici',
      payeeName: 'AutoPrint Apex Express',
    },
  },
  'metro-station': {
    id: 'metro-station',
    name: 'Metro QuickPrint 24x7',
    branch: 'Terminal 2 Concourse',
    address: 'Ground Floor, Concourse Gate 3, Central Metro Station',
    kioskNumber: 'Counter #04',
    status: 'online',
    activePrinters: ['Epson WorkForce Pro WF-C878R', 'Konica Minolta bizhub'],
    queueLength: 3,
    averageWaitMins: 4,
    rates: {
      bwSingle: 2.5,
      bwDoublePerSide: 2.0,
      colorSingle: 12.0,
      colorDoublePerSide: 9.5,
      photoGlossy: 30.0,
      a3Multiplier: 2.0,
      legalMultiplier: 1.2,
      letterMultiplier: 1.0,
      finishing: {
        staple: 5.0,
        spiral: 45.0,
        hardcover: 160.0,
        laminationPerSheet: 25.0,
      },
    },
    upiDetails: {
      vpa: 'autoprint.metro@okhdfcbank',
      payeeName: 'Metro QuickPrint Hub',
    },
  },
  'tech-park': {
    id: 'tech-park',
    name: 'Greenwood Print Lab & Stationers',
    branch: 'Tech Park Tower B',
    address: 'Building 4, Cyber City Corporate Hub, Sector 18',
    kioskNumber: 'Counter #02',
    status: 'online',
    activePrinters: ['Xerox VersaLink C7000', 'Brother MFC-L8900CDW'],
    queueLength: 0,
    averageWaitMins: 1,
    rates: {
      bwSingle: 2.0,
      bwDoublePerSide: 1.5,
      colorSingle: 10.0,
      colorDoublePerSide: 8.0,
      photoGlossy: 25.0,
      a3Multiplier: 2.0,
      legalMultiplier: 1.2,
      letterMultiplier: 1.0,
      finishing: {
        staple: 5.0,
        spiral: 35.0,
        hardcover: 140.0,
        laminationPerSheet: 20.0,
      },
    },
    upiDetails: {
      vpa: 'greenwood.autoprint@upi',
      payeeName: 'Greenwood Print Lab',
    },
  },
  'city-court': {
    id: 'city-court',
    name: 'Judicial District Legal Prints',
    branch: 'High Court Chamber Complex',
    address: 'Basement Level 1, Chamber Block C, High Court Road',
    kioskNumber: 'Counter #05',
    status: 'online',
    activePrinters: ['Ricoh MP 3055 SP', 'Canon iR-ADV DX 4735'],
    queueLength: 2,
    averageWaitMins: 3,
    rates: {
      bwSingle: 2.0,
      bwDoublePerSide: 1.5,
      colorSingle: 10.0,
      colorDoublePerSide: 8.0,
      photoGlossy: 25.0,
      a3Multiplier: 2.0,
      legalMultiplier: 1.0, // Legal standard
      letterMultiplier: 1.0,
      finishing: {
        staple: 5.0,
        spiral: 40.0,
        hardcover: 150.0,
        laminationPerSheet: 20.0,
      },
    },
    upiDetails: {
      vpa: 'legalprints.autoprint@sbi',
      payeeName: 'District Legal Prints',
    },
  },
};

export const DEFAULT_SHOP_ID = 'campus-hub';

export function resolveShopFromUrl(): ShopInfo {
  if (typeof window === 'undefined') return SHOPS_DATABASE[DEFAULT_SHOP_ID];

  const params = new URLSearchParams(window.location.search);
  const shopQuery = params.get('shop') || params.get('shopId') || params.get('kiosk');

  if (shopQuery && SHOPS_DATABASE[shopQuery]) {
    return SHOPS_DATABASE[shopQuery];
  }

  // If a custom named query is supplied (e.g. ?shop=Royal-Stationers)
  if (shopQuery) {
    const formattedName = decodeURIComponent(shopQuery)
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      id: shopQuery,
      name: `${formattedName} Print Shop`,
      branch: 'Express Self-Service Counter',
      address: 'Verified Shop Counter Location',
      kioskNumber: 'Counter #01',
      status: 'online',
      activePrinters: ['Canon Dual-Tray HighSpeed Printer'],
      queueLength: 1,
      averageWaitMins: 2,
      rates: SHOPS_DATABASE[DEFAULT_SHOP_ID].rates,
      upiDetails: {
        vpa: `autoprint.${shopQuery.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`,
        payeeName: formattedName,
      },
    };
  }

  return SHOPS_DATABASE[DEFAULT_SHOP_ID];
}
