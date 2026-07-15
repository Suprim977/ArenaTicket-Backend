import { Response, NextFunction } from 'express';
import { Ticket } from '../model/ticket.model';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middlewares/auth';
import { bookTicketDto } from './book-ticket.dto';

export class TicketController {
	bookTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { tournamentId, quantity } = bookTicketDto.parse(req.body);
			const unitPrice = Number(process.env.TICKET_UNIT_PRICE || 1000);
			const totalPrice = quantity * unitPrice;

			const ticket = await Ticket.create({
				tournament: tournamentId,
				quantity,
				totalPrice,
				user: req.user._id,
			});
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
