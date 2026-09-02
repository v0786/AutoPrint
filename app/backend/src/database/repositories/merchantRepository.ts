/**
 * Merchant Repository — Persistent SQLite operations for Merchant Onboarding,
 * Authentication, Sessions, and Shop Configuration.
 */

import crypto from 'crypto';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface MerchantRecord {
  id: string;
  shop_name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  password_salt: string;
  address: string;
  branch: string;
  kiosk_number: string;
  upi_id: string | null;
  upi_qr_data_url: string | null;
  selected_printer: string;
  color_price_per_page: number; // minor units (e.g. 1000 = 10.00 INR)
  bw_price_per_page: number;    // minor units (e.g. 200 = 2.00 INR)
  is_onboarded: number;
  is_online: number;
  created_at: string;
  updated_at: string;
}

export interface PublicShopProfile {
  id: string;
  name: string;
  owner: string;
  branch: string;
  address: string;
  kioskNumber: string;
  isOnline: boolean;
  isOnboarded: boolean;
  rates: {
    bwSingle: number;
    colorSingle: number;
  };
  upiDetails: {
    vpa: string | null;
    payeeName: string;
    qrDataUrl: string | null;
  };
  selectedPrinter: string;
}

export class MerchantRepository {
  private static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, s, 64).toString('hex');
    return { hash, salt: s };
  }

  public static getCount(): number {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM merchants').get() as { count: number };
    return row?.count ?? 0;
  }

  public static getPrimaryMerchant(): MerchantRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM merchants ORDER BY created_at ASC LIMIT 1').get() as MerchantRecord | undefined;
    return row || null;
  }

  public static getById(id: string): MerchantRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM merchants WHERE id = ?').get(id) as MerchantRecord | undefined;
    return row || null;
  }

  public static getByEmail(email: string): MerchantRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM merchants WHERE LOWER(email) = LOWER(?)').get(email) as MerchantRecord | undefined;
    return row || null;
  }

  public static createMerchant(data: {
    shopName: string;
    ownerName: string;
    email: string;
    phone?: string;
    password: string;
    address?: string;
    branch?: string;
    kioskNumber?: string;
    upiId?: string;
    upiQrDataUrl?: string;
    selectedPrinter?: string;
    colorPricePerPage?: number;
    bwPricePerPage?: number;
  }): MerchantRecord {
    const db = getDb();
    const id = uuidv4();
    const { hash, salt } = this.hashPassword(data.password);

    const stmt = db.prepare(`
      INSERT INTO merchants (
        id, shop_name, owner_name, email, phone,
        password_hash, password_salt, address, branch, kiosk_number,
        upi_id, upi_qr_data_url, selected_printer,
        color_price_per_page, bw_price_per_page,
        is_onboarded, is_online
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        1, 1
      )
    `);

    stmt.run(
      id,
      data.shopName,
      data.ownerName,
      data.email.toLowerCase().trim(),
      data.phone || null,
      hash,
      salt,
      data.address || '',
      data.branch || 'Main Branch',
      data.kioskNumber || 'Counter #01',
      data.upiId || null,
      data.upiQrDataUrl || null,
      data.selectedPrinter || 'AutoPrint Virtual Spooler',
      data.colorPricePerPage ?? 1000,
      data.bwPricePerPage ?? 200
    );

    return this.getById(id)!;
  }

  public static verifyCredentials(emailOrPhone: string, password: string): MerchantRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM merchants 
      WHERE LOWER(email) = LOWER(?) OR phone = ? 
      LIMIT 1
    `).get(emailOrPhone.trim(), emailOrPhone.trim()) as MerchantRecord | undefined;

    if (!row) return null;

    const { hash } = this.hashPassword(password, row.password_salt);
    if (hash === row.password_hash) {
      return row;
    }
    return null;
  }

  public static createSession(merchantId: string, days: number = 30): string {
    const db = getDb();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO merchant_sessions (token, merchant_id, expires_at)
      VALUES (?, ?, ?)
    `).run(token, merchantId, expiresAt);

    return token;
  }

  public static verifySession(token: string): MerchantRecord | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT m.* FROM merchants m
      JOIN merchant_sessions s ON m.id = s.merchant_id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token) as MerchantRecord | undefined;

    return row || null;
  }

  public static deleteSession(token: string): void {
    const db = getDb();
    db.prepare('DELETE FROM merchant_sessions WHERE token = ?').run(token);
  }

  public static updateProfile(id: string, data: {
    shopName?: string;
    ownerName?: string;
    address?: string;
    branch?: string;
    phone?: string;
    upiId?: string;
    upiQrDataUrl?: string;
    selectedPrinter?: string;
    colorPricePerPage?: number;
    bwPricePerPage?: number;
    isOnline?: boolean;
  }): MerchantRecord | null {
    const db = getDb();
    const current = this.getById(id);
    if (!current) return null;

    db.prepare(`
      UPDATE merchants SET
        shop_name = COALESCE(?, shop_name),
        owner_name = COALESCE(?, owner_name),
        address = COALESCE(?, address),
        branch = COALESCE(?, branch),
        phone = COALESCE(?, phone),
        upi_id = COALESCE(?, upi_id),
        upi_qr_data_url = COALESCE(?, upi_qr_data_url),
        selected_printer = COALESCE(?, selected_printer),
        color_price_per_page = COALESCE(?, color_price_per_page),
        bw_price_per_page = COALESCE(?, bw_price_per_page),
        is_online = COALESCE(?, is_online),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.shopName ?? null,
      data.ownerName ?? null,
      data.address ?? null,
      data.branch ?? null,
      data.phone ?? null,
      data.upiId ?? null,
      data.upiQrDataUrl ?? null,
      data.selectedPrinter ?? null,
      data.colorPricePerPage ?? null,
      data.bwPricePerPage ?? null,
      data.isOnline !== undefined ? (data.isOnline ? 1 : 0) : null,
      id
    );

    return this.getById(id);
  }

  public static getPublicShopProfile(): PublicShopProfile | null {
    const merchant = this.getPrimaryMerchant();
    if (!merchant || !merchant.is_onboarded) {
      return null;
    }

    return {
      id: merchant.id,
      name: merchant.shop_name,
      owner: merchant.owner_name,
      branch: merchant.branch,
      address: merchant.address,
      kioskNumber: merchant.kiosk_number,
      isOnline: Boolean(merchant.is_online),
      isOnboarded: Boolean(merchant.is_onboarded),
      rates: {
        bwSingle: merchant.bw_price_per_page / 100,
        colorSingle: merchant.color_price_per_page / 100,
      },
      upiDetails: {
        vpa: merchant.upi_id,
        payeeName: merchant.shop_name,
        qrDataUrl: merchant.upi_qr_data_url,
      },
      selectedPrinter: merchant.selected_printer,
    };
  }
}
