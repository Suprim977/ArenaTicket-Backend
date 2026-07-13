import { Router } from 'express';
import { TicketController } from './controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();
const ticketController = new TicketController();

router.post('/', authenticate, ticketController.bookTicket);
router.get('/my-tickets', authenticate, ticketController.getMyTickets);

export default router;