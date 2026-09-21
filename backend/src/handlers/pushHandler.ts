import { Response } from 'express';
import { AuthenticatedRequest } from './authHandler';
import { pushService } from '../services/pushService';
import { pushRepository } from '../repositories/pushRepository';

export class PushHandler {
  async getVapidKey(req: AuthenticatedRequest, res: Response) {
    try {
      const publicKey = pushService.getPublicKey();
      res.json({ success: true, data: { publicKey } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async subscribe(req: AuthenticatedRequest, res: Response) {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ success: false, error: 'Valid PushSubscription payload is required' });
      }

      await pushRepository.saveSubscription(req.userId!, req.deviceFp!, endpoint, keys);
      res.json({ success: true, message: 'Web Push subscription registered successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const pushHandler = new PushHandler();
