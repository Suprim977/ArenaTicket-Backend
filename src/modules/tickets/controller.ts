import { Response, NextFunction } from 'express';
import { TicketService } from './service';
import { createTicketSchema } from './validation';
import { sendSuccess } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class TicketController {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  bookTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = createTicketSchema.parse(req.body);
      
      const result = await this.ticketService.bookTicket(
        data.tournamentId,
        req.user!._id.toString(),
        data.price
      );
      
      sendSuccess(res, result, 'Ticket booked successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getMyTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.ticketService.getMyTickets(req.user!._id.toString());
      sendSuccess(res, result, 'My tickets retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}