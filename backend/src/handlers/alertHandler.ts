import { Response } from 'express';
import { AuthenticatedRequest } from './authHandler';
import { alertRepository } from '../repositories/alertRepository';
import { alertEngine } from '../signal/alertEngine';

export class AlertHandler {
  async getAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const alerts = await alertRepository.findByUserId(req.userId!);
      res.json({ success: true, data: alerts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const { symbol, condition, threshold, marketFilter } = req.body;
      if (!symbol || !condition || threshold === undefined) {
        return res.status(400).json({ success: false, error: 'symbol, condition, and threshold are required' });
      }

      const alert = await alertRepository.create(
        req.userId!,
        symbol,
        condition,
        Number(threshold),
        marketFilter
      );

      // Refresh engine cache
      await alertEngine.refreshActiveAlerts();

      res.json({ success: true, data: alert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async toggleAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const isActive = await alertRepository.toggleActive(id, req.userId!);
      await alertEngine.refreshActiveAlerts();
      res.json({ success: true, data: { id, isActive } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await alertRepository.delete(id, req.userId!);
      await alertEngine.refreshActiveAlerts();
      res.json({ success: true, message: 'Alert deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const alertHandler = new AlertHandler();
