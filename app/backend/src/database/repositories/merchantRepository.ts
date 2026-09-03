/**
 * Merchant Repository — Persistent SQLite operations for Merchant Onboarding,
 * Authentication, Sessions, and Shop Configuration.
 */

import crypto from 'crypto';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface StructuredShopRates {
  bwSingle: number;
  bwDoublePerSide: number;
  colorSingle: number;
  colorDoublePerSide: number;
  photoGlossy: number;
  a3Multiplier: number;
  legalMultiplier: number;
  letterMultiplier: number;
  finishing: {
    staple: number;
    spiral: number;
    hardcover: number;
    laminationPerSheet: number;
  };
}

export interface MerchantRecord {
  id: string;
  username?: string | null;
  shop_name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  password_salt: string;
  role?: 'admin' | 'staff';
  is_active?: number;
  address: string;
  branch: string;
  kiosk_number: string;
  upi_id: string | null;
  upi_qr_data_url: string | null;
  selected_printer: string;
  color_price_per_page: number; // minor units (e.g. 1000 = 10.00 INR)
  bw_price_per_page: number;    // minor units (e.g. 200 = 2.00 INR)
  photo_price_per_page?: number; // minor units (e.g. 2500 = 25.00 INR)
  rates_json?: string | null;
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
  rates: StructuredShopRates;
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
    let row = db.prepare("SELECT * FROM merchants WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1").get() as MerchantRecord | undefined;
    if (!row) {
      row = db.prepare('SELECT * FROM merchants ORDER BY created_at ASC LIMIT 1').get() as MerchantRecord | undefined;
    }
    return row || null;
  }

  public static hasAdmin(): boolean {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM merchants WHERE role = 'admin' AND is_active = 1").get() as { count: number };
    return (row?.count ?? 0) > 0;
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

  public static getByUsername(username: string): MerchantRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM merchants WHERE LOWER(username) = LOWER(?)').get(username.trim()) as MerchantRecord | undefined;
    return row || null;
  }

  public static getAllUsers(): Array<Omit<MerchantRecord, 'password_hash' | 'password_salt'>> {
    const db = getDb();
    return db.prepare(`
      SELECT id, username, shop_name, owner_name, email, phone, role, is_active,
             branch, kiosk_number, is_onboarded, is_online, created_at, updated_at
      FROM merchants
      ORDER BY (CASE WHEN role = 'admin' THEN 0 ELSE 1 END), created_at ASC
    `).all() as any[];
  }

  public static createUser(data: {
    username: string;
    ownerName: string;
    email: string;
    phone?: string;
    password: string;
    role?: 'admin' | 'staff';
    shopName?: string;
  }): MerchantRecord {
    const db = getDb();
    const id = uuidv4();
    const { hash, salt } = this.hashPassword(data.password);
    const role = data.role === 'admin' ? 'admin' : 'staff';
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();

    const existing = db.prepare(`
      SELECT id FROM merchants WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(cleanUsername, cleanEmail);

    if (existing) {
      throw new Error('A user with this username or email already exists.');
    }

    const primary = this.getPrimaryMerchant();

    db.prepare(`
      INSERT INTO merchants (
        id, username, shop_name, owner_name, email, phone,
        password_hash, password_salt, role, is_active,
        address, branch, kiosk_number, upi_id, selected_printer,
        color_price_per_page, bw_price_per_page, photo_price_per_page,
        rates_json, is_onboarded, is_online
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 1,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, 1, 1
      )
    `).run(
      id,
      cleanUsername,
      data.shopName || primary?.shop_name || 'AutoPrint Express Store',
      data.ownerName.trim(),
      cleanEmail,
      data.phone?.trim() || null,
      hash,
      salt,
      role,
      primary?.address || '',
      primary?.branch || 'Main Branch',
      primary?.kiosk_number || 'Counter #01',
      primary?.upi_id || null,
      primary?.selected_printer || 'AutoPrint Virtual Spooler',
      primary?.color_price_per_page ?? 1000,
      primary?.bw_price_per_page ?? 200,
      primary?.photo_price_per_page ?? 2500,
      primary?.rates_json || null
    );

    return this.getById(id)!;
  }

  public static deleteUser(id: string, requesterId: string): boolean {
    const db = getDb();
    if (id === requesterId) {
      throw new Error('Cannot delete your own active administrator account.');
    }
    const target = this.getById(id);
    if (!target) return false;

    if (target.role === 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM merchants WHERE role = 'admin'").get() as { count: number };
      if (adminCount.count <= 1) {
        throw new Error('Cannot delete the last remaining administrator account.');
      }
    }

    db.prepare('DELETE FROM merchant_sessions WHERE merchant_id = ?').run(id);
    db.prepare('DELETE FROM merchants WHERE id = ?').run(id);
    return true;
  }

  public static resetUserPassword(id: string, newPass: string): boolean {
    const db = getDb();
    const { hash, salt } = this.hashPassword(newPass);
    const res = db.prepare(`
      UPDATE merchants
      SET password_hash = ?, password_salt = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(hash, salt, id);
    return res.changes > 0;
  }

  public static createMerchant(data: {
    shopName: string;
    ownerName: string;
    email: string;
    username?: string;
    phone?: string;
    password: string;
    role?: 'admin' | 'staff';
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
    const username = data.username ? data.username.trim().toLowerCase() : (data.email.split('@')[0] || 'merchant');

    const stmt = db.prepare(`
      INSERT INTO merchants (
        id, username, shop_name, owner_name, email, phone,
        password_hash, password_salt, role, is_active,
        address, branch, kiosk_number,
        upi_id, upi_qr_data_url, selected_printer,
        color_price_per_page, bw_price_per_page,
        is_onboarded, is_online
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 1,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        1, 1
      )
    `);

    stmt.run(
      id,
      username,
      data.shopName,
      data.ownerName,
      data.email.toLowerCase().trim(),
      data.phone || null,
      hash,
      salt,
      data.role || 'admin',
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

  public static verifyCredentials(identifier: string, password: string): MerchantRecord | null {
    const db = getDb();
    const clean = identifier.trim();
    const row = db.prepare(`
      SELECT * FROM merchants 
      WHERE (
        LOWER(username) = LOWER(?) OR 
        LOWER(email) = LOWER(?) OR 
        phone = ?
      ) AND (is_active IS NULL OR is_active = 1)
      LIMIT 1
    `).get(clean, clean, clean) as MerchantRecord | undefined;

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
      JOIN merchant_sessions s ON s.merchant_id = m.id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    `).get(token) as MerchantRecord | undefined;

    return row || null;
  }

  public static invalidateSession(token: string): void {
    const db = getDb();
    db.prepare('DELETE FROM merchant_sessions WHERE token = ?').run(token);
  }

  public static parseStructuredRates(merchant: MerchantRecord): StructuredShopRates {
    let custom: Partial<StructuredShopRates> = {};
    if (merchant.rates_json) {
      try {
        custom = JSON.parse(merchant.rates_json);
      } catch {}
    }

    const bwSingle = merchant.bw_price_per_page ? merchant.bw_price_per_page / 100 : 2.0;
    const colorSingle = merchant.color_price_per_page ? merchant.color_price_per_page / 100 : 10.0;
    const photoGlossy = merchant.photo_price_per_page ? merchant.photo_price_per_page / 100 : (custom.photoGlossy ?? 25.0);

    return {
      bwSingle: custom.bwSingle ?? bwSingle,
      bwDoublePerSide: custom.bwDoublePerSide ?? Math.max(1.0, bwSingle * 0.75),
      colorSingle: custom.colorSingle ?? colorSingle,
      colorDoublePerSide: custom.colorDoublePerSide ?? Math.max(2.0, colorSingle * 0.8),
      photoGlossy: custom.photoGlossy ?? photoGlossy,
      a3Multiplier: custom.a3Multiplier ?? 2.0,
      legalMultiplier: custom.legalMultiplier ?? 1.25,
      letterMultiplier: custom.letterMultiplier ?? 1.0,
      finishing: {
        staple: custom.finishing?.staple ?? 5.0,
        spiral: custom.finishing?.spiral ?? 40.0,
        hardcover: custom.finishing?.hardcover ?? 150.0,
        laminationPerSheet: custom.finishing?.laminationPerSheet ?? 20.0,
      },
    };
  }

  public static updateProfile(
    id: string,
    data: {
      shopName?: string;
      ownerName?: string;
      address?: string;
      branch?: string;
      kioskNumber?: string;
      phone?: string;
      upiId?: string;
      upiQrDataUrl?: string;
      selectedPrinter?: string;
      colorPricePerPage?: number;
      bwPricePerPage?: number;
      photoPricePerPage?: number;
      ratesJson?: string;
      rates?: Partial<Omit<StructuredShopRates, 'finishing'>> & {
        finishing?: Partial<StructuredShopRates['finishing']>;
      };
      isOnline?: boolean;
    }
  ): MerchantRecord | null {
    const db = getDb();
    const current = this.getById(id);
    if (!current) return null;

    let computedRatesJson = data.ratesJson;
    if (!computedRatesJson && data.rates) {
      computedRatesJson = JSON.stringify(data.rates);
    }

    db.prepare(`
      UPDATE merchants SET
        shop_name = COALESCE(?, shop_name),
        owner_name = COALESCE(?, owner_name),
        address = COALESCE(?, address),
        branch = COALESCE(?, branch),
        kiosk_number = COALESCE(?, kiosk_number),
        phone = COALESCE(?, phone),
        upi_id = COALESCE(?, upi_id),
        upi_qr_data_url = COALESCE(?, upi_qr_data_url),
        selected_printer = COALESCE(?, selected_printer),
        color_price_per_page = COALESCE(?, color_price_per_page),
        bw_price_per_page = COALESCE(?, bw_price_per_page),
        photo_price_per_page = COALESCE(?, photo_price_per_page),
        rates_json = COALESCE(?, rates_json),
        is_online = COALESCE(?, is_online),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.shopName ?? null,
      data.ownerName ?? null,
      data.address ?? null,
      data.branch ?? null,
      data.kioskNumber ?? null,
      data.phone ?? null,
      data.upiId ?? null,
      data.upiQrDataUrl ?? null,
      data.selectedPrinter ?? null,
      data.colorPricePerPage ?? null,
      data.bwPricePerPage ?? null,
      data.photoPricePerPage ?? null,
      computedRatesJson ?? null,
      data.isOnline !== undefined ? (data.isOnline ? 1 : 0) : null,
      id
    );

    return this.getById(id);
  }

  public static getPublicShopProfile(): PublicShopProfile | null {
    const merchant = this.getPrimaryMerchant();
    if (!merchant) {
      return null;
    }

    const rates = this.parseStructuredRates(merchant);

    return {
      id: merchant.id,
      name: merchant.shop_name,
      owner: merchant.owner_name,
      branch: merchant.branch,
      address: merchant.address,
      kioskNumber: merchant.kiosk_number,
      isOnline: Boolean(merchant.is_online),
      isOnboarded: Boolean(merchant.is_onboarded),
      rates,
      upiDetails: {
        vpa: merchant.upi_id,
        payeeName: merchant.shop_name,
        qrDataUrl: merchant.upi_qr_data_url,
      },
      selectedPrinter: merchant.selected_printer,
    };
  }
}
