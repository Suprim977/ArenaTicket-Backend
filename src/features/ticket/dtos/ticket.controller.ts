import { Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth';
import { AppError } from '../../../middlewares/errorHandler';
import { sendSuccess } from '../../../utils/response';
import { TicketService } from '../service/ticket.service';

export class TicketController {
  private readonly ticketService = new TicketService();

  getMyTickets = async (req: AuthRequest, res: Response): Promise<void> => {
    const tickets = await this.ticketService.getMyTickets(req.user!._id.toString());
    sendSuccess(res, { tickets }, 'My tickets retrieved successfully');
  };

  getAllTickets = async (_req: AuthRequest, res: Response): Promise<void> => {
    const tickets = await this.ticketService.getAllTickets();
    sendSuccess(res, { tickets }, 'Tickets retrieved successfully');
  };

  verifyTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    const value = req.params.token;
    const token = Array.isArray(value) ? value[0] : value;
    if (!token?.trim()) throw new AppError('QR token is required', 400);
    const ticket = await this.ticketService.verify(token.trim());
    sendSuccess(res, { ticket }, 'Ticket is valid');
  };
}
