/* File: server/routes/journey.routes.ts */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
// FIX: Added .ts extension
import JourneyService from '../services/JourneyService.ts';

const router = Router();

router.get(
    '/progress',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Placeholder User ID
            const userId = (req as any).user?.id || 'test-user-id';

            const journeyStatus = await JourneyService.calculateJourneyStatus(userId);

            res.status(200).json(journeyStatus);
        } catch (error) {
            console.error('Error fetching journey progress:', error);
            next(error);
        }
    }
);

export default router;