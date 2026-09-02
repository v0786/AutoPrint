import { Request, Response, NextFunction } from 'express';
import { AutoPrintService } from '../services/autoprintService';

export class JobController {
  public static submitJob(req: Request, res: Response, next: NextFunction): void {
    try {
      const job = AutoPrintService.submitJob(req.body);
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
}
