import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AutoPrintService } from '../services/autoprintService';
import { PrintJobRequest, AppError } from '../types';

const submitJobSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(100).default('Walk-In Customer'),
  customerPhone: z.string().max(20).optional(),
  printerId: z.string().optional(),
  printerName: z.string().optional(),
  colorMode: z.enum(['bw', 'color']).default('bw'),
  copies: z.coerce.number().int().min(1).max(500).default(1),
  pageRange: z.string().default('all'),
  paperSize: z.enum(['a4', 'letter', 'a3', 'receipt_80mm']).default('a4'),
  duplex: z.enum(['single', 'double']).default('single'),
  finishing: z.enum(['none', 'staple', 'laminate']).default('none'),
  paymentMethod: z.enum(['UPI', 'CASH']).default('UPI'),
  amountMinorUnits: z.coerce.number().int().min(1).optional(),
  amountTotal: z.coerce.number().positive().optional(),
  currency: z.string().default('INR'),
  fileName: z.string().optional(),
});

export class JobController {
  public static async submitJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = submitJobSchema.parse(req.body);
      const file = req.file;

      // Determine fileName
      const fileName = file?.originalname || parsed.fileName || req.body.fileName;
      if (!fileName) {
        throw new AppError('A document file or fileName is required for print job submission.', 400);
      }

      // Convert amount: support either minor units (e.g. 2400) or total decimal (e.g. 24.00)
      let amountMinorUnits: number;
      if (parsed.amountMinorUnits !== undefined) {
        amountMinorUnits = parsed.amountMinorUnits;
      } else if (parsed.amountTotal !== undefined) {
        amountMinorUnits = Math.round(parsed.amountTotal * 100);
      } else {
        throw new AppError('amountMinorUnits or amountTotal is required and must be greater than 0.', 400);
      }

      const request: PrintJobRequest = {
        fileName,
        mimeType: file?.mimetype || 'application/pdf',
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        printerId: parsed.printerId,
        printerName: parsed.printerName,
        specs: {
          colorMode: parsed.colorMode,
          copies: parsed.copies,
          pageRange: parsed.pageRange,
          paperSize: parsed.paperSize,
          duplex: parsed.duplex,
          finishing: parsed.finishing,
        },
        paymentMethod: parsed.paymentMethod,
        amountMinorUnits,
        currency: parsed.currency,
      };

      const job = await AutoPrintService.submitJob(request, file?.buffer);

      res.status(201).json({
        ok: true,
        message: 'Print job successfully queued with verification code.',
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getAllJobs(_req: Request, res: Response, next: NextFunction): void {
    try {
      const jobs = AutoPrintService.getAllJobs();
      res.json({
        ok: true,
        count: jobs.length,
        data: jobs,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getJobById(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      const job = AutoPrintService.getJobById(id);
      if (!job) {
        res.status(404).json({ ok: false, error: 'Job not found' });
        return;
      }
      res.json({ ok: true, data: job });
    } catch (err) {
      next(err);
    }
  }

  public static updateJobStatus(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        throw new AppError('Status is required.', 400);
      }
      const updated = AutoPrintService.updateJobStatus(id, status);
      if (!updated) {
        res.status(404).json({ ok: false, error: 'Job not found' });
        return;
      }
      res.json({ ok: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static cancelJob(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      const updated = AutoPrintService.updateJobStatus(id, 'CANCELLED');
      res.json({ ok: true, message: 'Job cancelled successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static deleteJob(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      AutoPrintService.deleteJob(id);
      res.json({ ok: true, message: 'Job deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}