import { Router } from 'express';
import { TicketController } from './ticket.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();
const ticketController = new TicketController();

router.post('/', authenticate, ticketController.bookTicket);
router.get('/my-tickets', authenticate, ticketController.getMyTickets);

export default router;