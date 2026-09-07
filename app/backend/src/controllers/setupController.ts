/**
 * Setup Controller — First-Time Merchant Desk Onboarding & Initialization
 * Enforces zero-user first-run security and creates the initial merchant administrator.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MerchantRepository } from '../database/repositories/merchantRepository';

const CreateFirstUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  rememberMe: z.boolean().optional(),
  shopName: z.string().trim().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export class SetupController {
  /**
   * Check whether this installation has already been initialized with a merchant user.
   * Source of truth: backend SQLite merchants table.
   */
  public static async getStatus(_req: Request, res: Response): Promise<void> {
    const totalUsers = MerchantRepository.getCount();
    const hasUsers = totalUsers > 0;

    res.json({
      ok: true,
      initialized: hasUsers,
      hasUsers,
      totalUsers,
    });
  }

  /**
   * Create the primary merchant administrator on a fresh installation.
   * Strictly prohibited if any merchant user already exists.
   */
  public static async createFirstUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const totalUsers = MerchantRepository.getCount();
      if (totalUsers > 0) {
        res.status(403).json({
          ok: false,
          error: 'AutoPrint setup has already been completed. An administrator account already exists.',
        });
        return;
      }

      const parsed = CreateFirstUserSchema.parse(req.body);

      let merchant;
      try {
        merchant = MerchantRepository.createFirstAdmin({
          fullName: parsed.fullName,
          email: parsed.email,
          username: parsed.username || undefined,
          password: parsed.password,
          shopName: parsed.shopName,
        });
      } catch (repoErr: any) {
        if (repoErr.code === 'SETUP_ALREADY_COMPLETED' || repoErr.message === 'SETUP_ALREADY_COMPLETED') {
          res.status(403).json({
            ok: false,
            error: 'AutoPrint setup has already been completed. An administrator account already exists.',
          });
          return;
        }
        throw repoErr;
      }

      // Generate session token (90 days if "Remember this PC" is selected, else 7 days)
      const sessionDays = parsed.rememberMe ? 90 : 7;
      const token = MerchantRepository.createSession(merchant.id, sessionDays);

      res.status(201).json({
        ok: true,
        success: true,
        message: 'Administrator account created successfully.',
        data: {
          token,
          merchant: {
            id: merchant.id,
            username: merchant.username,
            role: merchant.role || 'admin',
            shopName: merchant.shop_name,
            ownerName: merchant.owner_name,
            email: merchant.email,
            phone: merchant.phone,
            address: merchant.address,
            branch: merchant.branch,
            kioskNumber: merchant.kiosk_number,
            selectedPrinter: merchant.selected_printer,
            isOnline: Boolean(merchant.is_online),
          },
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: err.issues.map((i) => i.message).join(', '),
          details: err.issues,
        });
        return;
      }
      next(err);
    }
  }
}
