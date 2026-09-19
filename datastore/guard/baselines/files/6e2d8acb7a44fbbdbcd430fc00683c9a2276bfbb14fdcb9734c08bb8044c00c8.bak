import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AutoPrintService } from '../services/autoprintService';
import { PrintJobRequest, AppError } from '../types';
import { generateTraceId, logTrace } from '../utils/traceLogger';
import { jobRepository } from '../database/repositories/jobRepository';
import { CONFIG } from '../config/environment';

const printSettingsSchema = z.object({
  paperFormat: z.string().optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  colorMode: z.enum(['black_and_white', 'color', 'bw']).optional(),
  copies: z.coerce.number().int().min(1).max(500).optional(),
  duplex: z.union([z.boolean(), z.enum(['single', 'double', 'true', 'false'])]).optional(),
  pageRange: z.string().optional(),
});

const submitJobSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(100).default('Walk-In Customer'),
  customerPhone: z.string().max(20).optional(),
  printerId: z.string().optional(),
  printerName: z.string().optional(),
  colorMode: z.enum(['bw', 'color', 'black_and_white']).default('bw'),
  copies: z.coerce.number().int().min(1).max(500).default(1),
  pageRange: z.string().default('all'),
  paperSize: z.string().optional(),
  paperFormat: z.string().optional(),
  duplex: z.union([z.boolean(), z.enum(['single', 'double', 'true', 'false'])]).default('single'),
  finishing: z.enum(['none', 'staple', 'laminate']).default('none'),
  printSettings: z.union([printSettingsSchema, z.string()]).optional(),
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

      const traceId = (req.headers['x-trace-id'] as string) || (req.body.traceId as string) || generateTraceId();

      // Determine fileName
      const fileName = file?.originalname || parsed.fileName || req.body.fileName;
      if (!fileName) {
        throw new AppError('A document file or fileName is required for print job submission.', 400);
      }

      logTrace(traceId, 'CUSTOMER_REQUEST_RECEIVED', 'Customer job request received', {
        fileName,
        customerName: parsed.customerName,
        paymentMethod: parsed.paymentMethod,
        amountMinorUnits: parsed.amountMinorUnits || (parsed.amountTotal ? Math.round(parsed.amountTotal * 100) : 0),
        backendPort: CONFIG.PORT,
        backendUrl: CONFIG.API_BASE_URL,
      });

      // Parse printSettings object if submitted as string (e.g. from multipart form-data)
      let printSettingsObj: any = undefined;
      if (typeof parsed.printSettings === 'string') {
        try {
          printSettingsObj = JSON.parse(parsed.printSettings);
        } catch {
          throw new AppError('Invalid printSettings JSON format.', 400);
        }
      } else if (parsed.printSettings && typeof parsed.printSettings === 'object') {
        printSettingsObj = parsed.printSettings;
      }

      // Validate paperFormat strictly
      const rawFormat = parsed.paperFormat || printSettingsObj?.paperFormat || parsed.paperSize;
      if (rawFormat !== undefined && rawFormat !== null && rawFormat !== '') {
        const normalized = String(rawFormat).trim().toLowerCase();
        const validFormats = ['a4', 'a3', 'letter', 'legal', '80mm', 'receipt_80mm'];
        if (!validFormats.includes(normalized)) {
          throw new AppError(`Invalid print configuration: paperFormat must be one of: A4, A3, Letter, Legal, 80mm. Received: "${rawFormat}"`, 400);
        }
      }

      logTrace(traceId, 'JOB_VALIDATED', 'Print job specifications validated successfully', {
        paperFormat: rawFormat || 'A4',
        copies: parsed.copies,
        colorMode: parsed.colorMode,
      });

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
          colorMode: parsed.colorMode === 'color' ? 'color' : 'bw',
          copies: parsed.copies,
          pageRange: parsed.pageRange,
          paperSize: (parsed.paperSize || (rawFormat ? String(rawFormat).toLowerCase() : 'a4')) as any,
          duplex: (parsed.duplex === true || parsed.duplex === 'double' || parsed.duplex === 'true') ? 'double' : 'single',
          finishing: parsed.finishing,
        },
        printSettings: printSettingsObj,
        paymentMethod: parsed.paymentMethod,
        amountMinorUnits,
        currency: parsed.currency,
        traceId,
      };

      const job = await AutoPrintService.submitJob(request, file?.buffer, traceId);

      // Verify that the job was actually persisted into SQLite
      const persisted = jobRepository.getById(job.id);
      const queueVisible = Boolean(persisted && persisted.id === job.id);

      logTrace(traceId, 'JOB_QUEUE_QUERY', 'Job confirmed in SQLite active queue', {
        jobId: job.id,
        status: job.status,
        queueVisible,
      });

      res.status(201).json({
        success: queueVisible,
        ok: true,
        jobId: job.id,
        jobNo: job.jobNo,
        status: job.status,
        queueVisible,
        traceId,
        databasePath: CONFIG.PATHS.DB_FILE,
        message: 'Print job successfully queued with verification code.',
        data: {
          ...job,
          traceId,
          queueVisible,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static getAllJobs(req: Request, res: Response, next: NextFunction): void {
    try {
      const traceId = (req.headers['x-trace-id'] as string) || (req.query.traceId as string) || '';
      const jobs = AutoPrintService.getAllJobs();

      if (traceId) {
        logTrace(traceId, 'MERCHANT_JOB_RECEIVED', `Merchant queue request returned ${jobs.length} jobs`, {
          count: jobs.length,
          databasePath: CONFIG.PATHS.DB_FILE,
        });
      }

      res.json({
        ok: true,
        count: jobs.length,
        databasePath: CONFIG.PATHS.DB_FILE,
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
      const { status, reason, actor } = req.body;
      const traceId = (req.headers['x-trace-id'] as string) || (req.body.traceId as string) || '';
      if (!status) {
        res.status(400).json({ ok: false, error: 'Status is required' });
        return;
      }

      const updated = AutoPrintService.updateJobStatus(id, status, actor || 'MERCHANT', reason, traceId);
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

  public static async confirmCash(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { staffId, staffName, tenderedMinorUnits } = req.body || {};

      const updated = await AutoPrintService.confirmCashPayment(
        id,
        staffId || 'STAFF-DESK-01',
        staffName || 'Counter Staff',
        tenderedMinorUnits ? Number(tenderedMinorUnits) : undefined
      );

      res.json({
        ok: true,
        message: 'Cash payment confirmed and print job dispatched to printer spooler.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async triggerPrint(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const job = await AutoPrintService.executePrintJob(id);
      if (!job) {
        res.status(404).json({ ok: false, error: 'Job not found or ineligible for printing' });
        return;
      }

      res.json({
        ok: true,
        message: 'Print execution triggered.',
        data: job,
      });
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