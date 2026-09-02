/**
 * Merchant Controller — Handles onboarding, authentication, sessions,
 * shop configuration, payment receiver setup, and printer preferences.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MerchantRepository } from '../database/repositories/merchantRepository';
import { PaymentConfigRepository } from '../database/repositories/paymentConfigRepository';

// Validation Schemas
const OnboardSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  address: z.string().optional(),
  branch: z.string().optional(),
  kioskNumber: z.string().optional(),
  upiId: z.string().optional(),
  upiQrDataUrl: z.string().optional(),
  selectedPrinter: z.string().optional(),
  colorPricePerPage: z.number().positive().optional(),
  bwPricePerPage: z.number().positive().optional(),
});

const LoginSchema = z.object({
  emailOrPhone: z.string().min(3, 'Email or phone required'),
  password: z.string().min(1, 'Password required'),
  rememberMe: z.boolean().optional(),
});

const UpdateProfileSchema = z.object({
  shopName: z.string().optional(),
  ownerName: z.string().optional(),
  address: z.string().optional(),
  branch: z.string().optional(),
  phone: z.string().optional(),
  upiId: z.string().optional(),
  upiQrDataUrl: z.string().optional(),
  selectedPrinter: z.string().optional(),
  colorPricePerPage: z.number().optional(),
  bwPricePerPage: z.number().optional(),
  isOnline: z.boolean().optional(),
});

const PaymentReceiverSchema = z.object({
  provider: z.enum(['UPI_DIRECT', 'RAZORPAY', 'JUSPAY']).optional(),
  upiId: z.string().optional(),
  upiPayeeName: z.string().optional(),
  upiQrDataUrl: z.string().optional(),
  razorpayKeyId: z.string().optional(),
  razorpayKeySecret: z.string().optional(),
});

export class MerchantController {
  /**
   * Checks onboarding status and active session validity
   */
  public static async checkAuth(req: Request, res: Response): Promise<void> {
    const merchantCount = MerchantRepository.getCount();
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    let authenticatedMerchant = null;
    if (token) {
      authenticatedMerchant = MerchantRepository.verifySession(token);
    }

    const primary = MerchantRepository.getPrimaryMerchant();

    res.json({
      ok: true,
      data: {
        isOnboarded: merchantCount > 0 && Boolean(primary?.is_onboarded),
        isAuthenticated: Boolean(authenticatedMerchant),
        merchant: authenticatedMerchant ? {
          id: authenticatedMerchant.id,
          shopName: authenticatedMerchant.shop_name,
          ownerName: authenticatedMerchant.owner_name,
          email: authenticatedMerchant.email,
          phone: authenticatedMerchant.phone,
          address: authenticatedMerchant.address,
          branch: authenticatedMerchant.branch,
          kioskNumber: authenticatedMerchant.kiosk_number,
          upiId: authenticatedMerchant.upi_id,
          upiQrDataUrl: authenticatedMerchant.upi_qr_data_url,
          selectedPrinter: authenticatedMerchant.selected_printer,
          colorPricePerPage: authenticatedMerchant.color_price_per_page,
          bwPricePerPage: authenticatedMerchant.bw_price_per_page,
          isOnline: Boolean(authenticatedMerchant.is_online),
        } : null,
      },
    });
  }

  /**
   * First-Launch Merchant Onboarding
   */
  public static async onboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = OnboardSchema.parse(req.body);

      // Check if email already registered
      const existing = MerchantRepository.getByEmail(parsed.email);
      if (existing) {
        res.status(409).json({ ok: false, error: 'A merchant with this email already exists.' });
        return;
      }

      const merchant = MerchantRepository.createMerchant({
        shopName: parsed.shopName,
        ownerName: parsed.ownerName,
        email: parsed.email,
        phone: parsed.phone,
        password: parsed.password,
        address: parsed.address,
        branch: parsed.branch,
        kioskNumber: parsed.kioskNumber,
        upiId: parsed.upiId,
        upiQrDataUrl: parsed.upiQrDataUrl,
        selectedPrinter: parsed.selectedPrinter,
        colorPricePerPage: parsed.colorPricePerPage ? Math.round(parsed.colorPricePerPage * 100) : 1000,
        bwPricePerPage: parsed.bwPricePerPage ? Math.round(parsed.bwPricePerPage * 100) : 200,
      });

      // Also initialize payment config
      if (parsed.upiId || parsed.upiQrDataUrl) {
        PaymentConfigRepository.saveConfig({
          merchantId: merchant.id,
          provider: 'UPI_DIRECT',
          upiId: parsed.upiId,
          upiPayeeName: parsed.shopName,
          upiQrDataUrl: parsed.upiQrDataUrl,
        });
      }

      const token = MerchantRepository.createSession(merchant.id, 90); // 90 days persistent session

      res.status(201).json({
        ok: true,
        data: {
          token,
          merchant: {
            id: merchant.id,
            shopName: merchant.shop_name,
            ownerName: merchant.owner_name,
            email: merchant.email,
            phone: merchant.phone,
            address: merchant.address,
            branch: merchant.branch,
            kioskNumber: merchant.kiosk_number,
            upiId: merchant.upi_id,
            upiQrDataUrl: merchant.upi_qr_data_url,
            selectedPrinter: merchant.selected_printer,
            colorPricePerPage: merchant.color_price_per_page,
            bwPricePerPage: merchant.bw_price_per_page,
            isOnline: Boolean(merchant.is_online),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Merchant Login with Password Verification
   */
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = LoginSchema.parse(req.body);
      const merchant = MerchantRepository.verifyCredentials(parsed.emailOrPhone, parsed.password);

      if (!merchant) {
        res.status(401).json({ ok: false, error: 'Invalid email or password.' });
        return;
      }

      const sessionDays = parsed.rememberMe ? 90 : 7;
      const token = MerchantRepository.createSession(merchant.id, sessionDays);

      res.json({
        ok: true,
        data: {
          token,
          merchant: {
            id: merchant.id,
            shopName: merchant.shop_name,
            ownerName: merchant.owner_name,
            email: merchant.email,
            phone: merchant.phone,
            address: merchant.address,
            branch: merchant.branch,
            kioskNumber: merchant.kiosk_number,
            upiId: merchant.upi_id,
            upiQrDataUrl: merchant.upi_qr_data_url,
            selectedPrinter: merchant.selected_printer,
            colorPricePerPage: merchant.color_price_per_page,
            bwPricePerPage: merchant.bw_price_per_page,
            isOnline: Boolean(merchant.is_online),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Merchant Logout
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);
    if (token) {
      MerchantRepository.invalidateSession(token);
    }
    res.json({ ok: true, message: 'Logged out successfully.' });
  }

  /**
   * Get Authenticated Merchant Profile
   */
  public static async getProfile(req: Request, res: Response): Promise<void> {
    const primary = MerchantRepository.getPrimaryMerchant();
    if (!primary) {
      res.status(404).json({ ok: false, error: 'No merchant profile found.' });
      return;
    }

    const payConfig = PaymentConfigRepository.getConfig();

    res.json({
      ok: true,
      data: {
        id: primary.id,
        shopName: primary.shop_name,
        ownerName: primary.owner_name,
        email: primary.email,
        phone: primary.phone,
        address: primary.address,
        branch: primary.branch,
        kioskNumber: primary.kiosk_number,
        upiId: primary.upi_id || payConfig?.upi_id || null,
        upiQrDataUrl: primary.upi_qr_data_url || payConfig?.upi_qr_data_url || null,
        selectedPrinter: primary.selected_printer,
        colorPricePerPage: primary.color_price_per_page / 100,
        bwPricePerPage: primary.bw_price_per_page / 100,
        isOnline: Boolean(primary.is_online),
        paymentConfig: {
          provider: payConfig?.provider || 'UPI_DIRECT',
          upiId: payConfig?.upi_id || primary.upi_id || null,
          upiPayeeName: payConfig?.upi_payee_name || primary.shop_name,
          upiQrDataUrl: payConfig?.upi_qr_data_url || primary.upi_qr_data_url || null,
          razorpayKeyId: payConfig?.razorpay_key_id || null,
          hasRazorpaySecret: Boolean(payConfig?.razorpay_key_secret),
        },
      },
    });
  }

  /**
   * Update Profile & Rates
   */
  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const primary = MerchantRepository.getPrimaryMerchant();
      if (!primary) {
        res.status(404).json({ ok: false, error: 'No merchant profile exists.' });
        return;
      }

      const parsed = UpdateProfileSchema.parse(req.body);
      const updated = MerchantRepository.updateProfile(primary.id, {
        shopName: parsed.shopName,
        ownerName: parsed.ownerName,
        address: parsed.address,
        branch: parsed.branch,
        phone: parsed.phone,
        upiId: parsed.upiId,
        upiQrDataUrl: parsed.upiQrDataUrl,
        selectedPrinter: parsed.selectedPrinter,
        colorPricePerPage: parsed.colorPricePerPage !== undefined ? Math.round(parsed.colorPricePerPage * 100) : undefined,
        bwPricePerPage: parsed.bwPricePerPage !== undefined ? Math.round(parsed.bwPricePerPage * 100) : undefined,
        isOnline: parsed.isOnline,
      });

      res.json({ ok: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Shop Profile for Customer Web (Returns null/offline if merchant not configured)
   */
  public static async getPublicProfile(_req: Request, res: Response): Promise<void> {
    const publicProfile = MerchantRepository.getPublicShopProfile();
    const payConfig = PaymentConfigRepository.getPublicPaymentConfig();

    if (!publicProfile || !publicProfile.isOnboarded || !publicProfile.isOnline) {
      res.json({
        ok: true,
        data: null,
        isAvailable: false,
        message: 'No shop is selected',
      });
      return;
    }

    res.json({
      ok: true,
      isAvailable: true,
      data: {
        ...publicProfile,
        paymentConfig: payConfig,
      },
    });
  }

  /**
   * Configure Payment Receiver (UPI ID, QR Data URL, Gateway Keys)
   */
  public static async updatePaymentReceiver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = PaymentReceiverSchema.parse(req.body);
      const primary = MerchantRepository.getPrimaryMerchant();

      const updatedConfig = PaymentConfigRepository.saveConfig({
        merchantId: primary?.id,
        provider: parsed.provider,
        upiId: parsed.upiId,
        upiPayeeName: parsed.upiPayeeName || primary?.shop_name,
        upiQrDataUrl: parsed.upiQrDataUrl,
        razorpayKeyId: parsed.razorpayKeyId,
        razorpayKeySecret: parsed.razorpayKeySecret,
      });

      // Synchronize UPI ID with merchant record if provided
      if (primary && (parsed.upiId || parsed.upiQrDataUrl)) {
        MerchantRepository.updateProfile(primary.id, {
          upiId: parsed.upiId,
          upiQrDataUrl: parsed.upiQrDataUrl,
        });
      }

      res.json({
        ok: true,
        message: 'Payment receiver configuration saved successfully.',
        data: {
          provider: updatedConfig.provider,
          upiId: updatedConfig.upi_id,
          upiPayeeName: updatedConfig.upi_payee_name,
          hasQrImage: Boolean(updatedConfig.upi_qr_data_url),
          razorpayKeyId: updatedConfig.razorpay_key_id,
          hasRazorpaySecret: Boolean(updatedConfig.razorpay_key_secret),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Configure Active Printer for incoming jobs
   */
  public static async updatePrinter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { printerName } = req.body;
      if (!printerName) {
        res.status(400).json({ ok: false, error: 'Printer name is required.' });
        return;
      }

      const primary = MerchantRepository.getPrimaryMerchant();
      if (primary) {
        MerchantRepository.updateProfile(primary.id, { selectedPrinter: printerName });
      }

      res.json({ ok: true, selectedPrinter: printerName });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggle Shop Online/Offline
   */
  public static async toggleOnline(req: Request, res: Response): Promise<void> {
    const { isOnline } = req.body;
    const primary = MerchantRepository.getPrimaryMerchant();
    if (!primary) {
      res.status(404).json({ ok: false, error: 'No merchant profile exists.' });
      return;
    }

    const updated = MerchantRepository.updateProfile(primary.id, { isOnline: Boolean(isOnline) });
    res.json({ ok: true, isOnline: Boolean(updated?.is_online) });
  }
}
