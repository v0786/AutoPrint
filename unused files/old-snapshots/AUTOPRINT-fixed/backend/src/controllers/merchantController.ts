import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../database/db';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads/qr');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export class MerchantController {
  /**
   * Retrieves current merchant payment configuration
   */
  public static getPaymentConfig(_req: Request, res: Response, next: NextFunction): void {
    try {
      res.json({
        ok: true,
        data: db.merchantPaymentConfig,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates merchant payment configuration (Payment method: QR, UPI, BOTH, upiId)
   */
  public static updatePaymentConfig(req: Request, res: Response, next: NextFunction): void {
    try {
      const { paymentMethod, upiId, shopName } = req.body;

      if (paymentMethod && !['QR', 'UPI', 'BOTH'].includes(paymentMethod)) {
        res.status(400).json({ ok: false, error: 'paymentMethod must be QR, UPI, or BOTH' });
        return;
      }

      if (upiId !== undefined) {
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (upiId.trim() && !upiRegex.test(upiId.trim())) {
          res.status(400).json({ ok: false, error: 'Invalid UPI ID format. Example: shopname@upi' });
          return;
        }
      }

      const updated = db.saveMerchantConfig({
        paymentMethod: paymentMethod || db.merchantPaymentConfig.paymentMethod,
        upiId: upiId !== undefined ? upiId.trim() : db.merchantPaymentConfig.upiId,
        shopName: shopName !== undefined ? shopName.trim() : db.merchantPaymentConfig.shopName,
      });

      res.json({
        ok: true,
        message: 'Merchant payment configuration saved successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Accepts Base64 or binary QR Code image upload and stores it safely on backend disk
   */
  public static uploadQrCode(req: Request, res: Response, next: NextFunction): void {
    try {
      const { fileName, base64Data } = req.body;

      if (!base64Data) {
        res.status(400).json({ ok: false, error: 'base64Data is required for QR image upload' });
        return;
      }

      ensureUploadsDir();

      // Extract image extension from base64 or fallback to png
      const mimeMatch = base64Data.match(/^data:image\/(png|jpe?g|webp);base64,/);
      const ext = mimeMatch ? mimeMatch[1].replace('jpeg', 'jpg') : 'png';
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

      const saveFileName = `merchant_qr_${Date.now()}.${ext}`;
      const saveFilePath = path.join(UPLOADS_DIR, saveFileName);

      fs.writeFileSync(saveFilePath, Buffer.from(cleanBase64, 'base64'));

      const qrImageUrl = `/uploads/qr/${saveFileName}`;

      const updated = db.saveMerchantConfig({
        qrImageUrl,
        qrFileName: fileName || saveFileName,
      });

      res.json({
        ok: true,
        message: 'Merchant QR Code image uploaded and stored successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
