import { Response, NextFunction } from 'express';
import { Ticket } from './model';
import { sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth';

export class TicketController {
  bookTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticket = await Ticket.create({ ...req.body, user: req.user._id });
      sendSuccess(res, ticket, 'Ticket booked successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getMyTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tickets = await Ticket.find({ user: req.user._id }).populate('tournament', 'title date');
      sendSuccess(res, tickets, 'My tickets retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}