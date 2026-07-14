import { Ticket, ITicket } from './ticket.model';

export class TicketRepository {
  async createTicket(data: Partial<ITicket>): Promise<ITicket> {
    const ticket = new Ticket(data);
    return await ticket.save();
  }

  async getMyTickets(userId: string): Promise<ITicket[]> {
    return await Ticket.find({ user: userId }).populate('tournament', 'title date location');
  }
}