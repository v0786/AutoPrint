import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing, parsePageRange } from '../src/utils/pricingCalculator';
import type { PrintPreferences, PricingSettings } from '../src/types';

const TEST_PRICING: PricingSettings = {
  countryCode: 'IN',
  bwPricePerPage: 2.0,
  colorPricePerPage: 10.0,
  a3Multiplier: 2.0,
  legalMultiplier: 1.2,
  duplexDiscountPercent: 10,
  paperFinishPrices: {
    standard_80gsm: 0,
    premium_100gsm: 1.0,
    glossy_photo_200gsm: 5.0,
    cardstock_250gsm: 8.0,
  },
  bindingPrices: {
    none: 0,
    staple_top_left: 5.0,
    corner_punch: 10.0,
    spiral_bound: 50.0,
    comb_bound: 40.0,
  },
  bulkDiscounts: [
    { minPages: 50, discountPercent: 5 },
    { minPages: 100, discountPercent: 10 },
    { minPages: 500, discountPercent: 15 },
  ],
  currency: '\u20B9',
  currencyCode: 'INR',
  symbolPosition: 'prefix',
  taxName: 'GST',
  taxRatePercent: 18,
};

const BASE_PREFS: PrintPreferences = {
  colorMode: 'bw',
  paperSize: 'A4',
  sidedness: 'single',
  orientation: 'portrait',
  pageRange: 'All',
  copies: 1,
  paperFinish: 'standard_80gsm',
  binding: 'none',
  customNotes: '',
};

test('parsePageRange: returns total pages for "All"', () => {
  assert.equal(parsePageRange('All', 10), 10);
  assert.equal(parsePageRange('all', 10), 10);
  assert.equal(parsePageRange('', 10), 10);
});

test('parsePageRange: parses single pages', () => {
  assert.equal(parsePageRange('1', 10), 1);
  assert.equal(parsePageRange('5', 10), 1);
  assert.equal(parsePageRange('1,3,5', 10), 3);
});

test('parsePageRange: parses page ranges', () => {
  assert.equal(parsePageRange('1-5', 10), 5);
  assert.equal(parsePageRange('3-7', 10), 5);
});

test('parsePageRange: parses mixed format', () => {
  assert.equal(parsePageRange('1-3, 5, 8-10', 10), 7);
});

test('parsePageRange: clamps out of range pages', () => {
  assert.equal(parsePageRange('1-100', 10), 10);
  assert.equal(parsePageRange('99', 10), 0);
  assert.equal(parsePageRange('99', 10), 0);
});

test('calculatePricing: basic B&W single-sided 10 pages', () => {
  const result = calculatePricing(10, BASE_PREFS, TEST_PRICING);
  assert.equal(result.totalPages, 10);
  assert.equal(result.subtotal, 20);
  assert.equal(result.basePagePrice, 2);
  assert.equal(result.finishSurcharge, 0);
  assert.equal(result.bindingSurcharge, 0);
  assert.equal(result.duplexDiscount, 0);
  assert.equal(result.bulkDiscount, 0);
  assert.equal(result.tax, Number((20 * 0.18).toFixed(2)));
  assert.equal(result.total, Number((20 * 1.18).toFixed(2)));
});

test('calculatePricing: color mode surcharge applied', () => {
  const colorPrefs = { ...BASE_PREFS, colorMode: 'color' as const };
  const result = calculatePricing(5, colorPrefs, TEST_PRICING);
  assert.equal(result.basePagePrice, 10);
  assert.equal(result.subtotal, 50);
  assert.equal(result.colorSurcharge, 5 * (10 - 2));
});

test('calculatePricing: copies multiplier applied', () => {
  const copyPrefs = { ...BASE_PREFS, copies: 3 };
  const result = calculatePricing(4, copyPrefs, TEST_PRICING);
  assert.equal(result.totalPages, 12);
  assert.equal(result.subtotal, 24);
});

test('calculatePricing: A3 size multiplier applied', () => {
  const a3Prefs = { ...BASE_PREFS, paperSize: 'A3' as const };
  const result = calculatePricing(10, a3Prefs, TEST_PRICING);
  assert.equal(result.basePagePrice, 2 * 2);
  assert.equal(result.subtotal, 40);
});

test('calculatePricing: duplex discount applied', () => {
  const duplexPrefs = { ...BASE_PREFS, sidedness: 'double_long' as const };
  const result = calculatePricing(100, duplexPrefs, TEST_PRICING);
  assert.ok(result.duplexDiscount > 0);
});

test('calculatePricing: paper finish surcharge applied', () => {
  const finishPrefs = { ...BASE_PREFS, paperFinish: 'premium_100gsm' as const };
  const result = calculatePricing(10, finishPrefs, TEST_PRICING);
  assert.equal(result.finishSurcharge, 10 * 1);
});

test('calculatePricing: binding surcharge applied per copy', () => {
  const bindingPrefs = { ...BASE_PREFS, binding: 'spiral_bound' as const, copies: 2 };
  const result = calculatePricing(10, bindingPrefs, TEST_PRICING);
  assert.equal(result.bindingSurcharge, 100);
});

test('calculatePricing: bulk discount 5% at 50 pages', () => {
  const bulkPrefs = { ...BASE_PREFS, copies: 10 };
  const result = calculatePricing(5, bulkPrefs, TEST_PRICING);
  assert.equal(result.totalPages, 50);
  assert.ok(result.bulkDiscount > 0);
});

test('calculatePricing: tax calculation correct', () => {
  const result = calculatePricing(10, BASE_PREFS, TEST_PRICING);
  const expectedPreTax = 20;
  const expectedTax = Number((expectedPreTax * 0.18).toFixed(2));
  assert.equal(result.tax, expectedTax);
  assert.equal(result.total, Number((expectedPreTax + expectedTax).toFixed(2)));
});

test('calculatePricing: page range reduces effective page count', () => {
  const rangePrefs = { ...BASE_PREFS, pageRange: '1-5' };
  const result = calculatePricing(20, rangePrefs, TEST_PRICING);
  assert.equal(result.totalPages, 5);
});
