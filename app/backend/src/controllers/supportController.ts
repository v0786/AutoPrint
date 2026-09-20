import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SupportService } from '../services/supportService';

const customerTicketSchema = z.object({
  customerName: z.string().max(100).optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  verificationCode: z.string().max(20).optional(),
  category: z.string().min(1, 'Issue category is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  description: z.string().min(10, 'Please describe your issue with at least 10 characters'),
});

const merchantTicketSchema = z.object({
  merchantId: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  description: z.string().min(10, 'Detailed description is required'),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
  stepsTried: z.string().optional(),
  affectedJobId: z.string().optional(),
  affectedVerificationCode: z.string().optional(),
  includeDiagnostics: z.boolean().default(true),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_INFO', 'RESOLVED', 'CLOSED', 'REOPENED']),
  actor: z.string().default('STAFF'),
  notes: z.string().optional(),
});

export class SupportController {
  public static createCustomerTicket(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = customerTicketSchema.parse(req.body);
      const ticket = SupportService.createCustomerTicket({
        customerName: parsed.customerName,
        customerEmail: parsed.customerEmail || undefined,
        verificationCode: parsed.verificationCode,
        category: parsed.category,
        priority: parsed.priority,
        description: parsed.description,
      });

      res.status(201).json({
        ok: true,
        message: 'Your support ticket has been created successfully. Our team will review it shortly.',
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createMerchantTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = merchantTicketSchema.parse(req.body);
      const ticket = await SupportService.createMerchantTicket(parsed);

      res.status(201).json({
        ok: true,
        message: 'Merchant support ticket logged and queued for support investigation.',
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getAllTickets(req: Request, res: Response, next: NextFunction): void {
    try {
      const { source, status, category } = req.query as { source?: string; status?: string; category?: string };
      const tickets = SupportService.getAllTickets({ source, status, category });
      res.json({ ok: true, count: tickets.length, data: tickets });
    } catch (err) {
      next(err);
    }
  }

  public static getTicketById(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      const ticket = SupportService.getTicketById(id) || SupportService.getTicketByNo(id);
      if (!ticket) {
        res.status(404).json({ ok: false, error: 'Support ticket not found' });
        return;
      }
      const history = SupportService.getTicketHistory(ticket.id);
      res.json({ ok: true, data: { ...ticket, history } });
    } catch (err) {
      next(err);
    }
  }

  public static updateTicketStatus(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      const { status, actor, notes } = updateStatusSchema.parse(req.body);
      const updated = SupportService.updateTicketStatus(id, status, actor, notes);
      if (!updated) {
        res.status(404).json({ ok: false, error: 'Support ticket not found' });
        return;
      }
      res.json({ ok: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async previewDiagnostics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preview = await SupportService.previewSafeDiagnostics();
      res.json({ ok: true, data: preview });
    } catch (err) {
      next(err);
    }
  }

  public static getSyncStatus(_req: Request, res: Response, next: NextFunction): void {
    try {
      const status = SupportService.getSyncStatus();
      res.json({ ok: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  public static async getSanitizedReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { DiagnosticCollector } = await import('../utils/diagnosticCollector.js');
      const report = await DiagnosticCollector.generateSanitizedReport();
      if (_req.headers.accept?.includes('text/plain')) {
        res.type('text/plain').send(report);
      } else {
        res.json({ ok: true, report });
      }
    } catch (err) {
      next(err);
    }
  }
}

