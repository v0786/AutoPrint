export interface DetectedPrinter {
  id: string;
  name: string;
  type: 'usb' | 'network' | 'bluetooth';
}

export function detectPrinters(): DetectedPrinter[] {
  return [
    { id: 'usb-01', name: 'Brother DCP-L2540DW', type: 'usb' },
    { id: 'net-01', name: 'HP LaserJet 4V', type: 'network' },
    { id: 'bt-01', name: 'Canon SELPHY', type: 'bluetooth' }
  ];
}

export function getPrinterSummary() {
  return detectPrinters().map(printer => `${printer.name} (${printer.type})`).join(', ');
}
