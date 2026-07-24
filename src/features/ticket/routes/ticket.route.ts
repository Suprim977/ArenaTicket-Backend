import { Router } from 'express';
import { TicketController } from '../dtos/ticket.controller';
import { authenticate } from '../../../middlewares/auth';
import { authorize } from '../../../middlewares/authorize';
import { asyncHandler } from '../../../utils/asyncHandler';

const router = Router();
const controller = new TicketController();

router.get('/my', authenticate, asyncHandler(controller.getMyTickets));
router.get('/verify/:token', authenticate, authorize('admin'), asyncHandler(controller.verifyTicket));
router.get('/', authenticate, authorize('admin'), asyncHandler(controller.getAllTickets));

export default router;
