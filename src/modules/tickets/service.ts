import { TicketRepository } from './repository';
import { ITicket } from './model';

export class TicketService {
  private ticketRepository: TicketRepository;

  constructor() {
    this.ticketRepository = new TicketRepository();
  }

  async bookTicket(tournamentId: string, userId: string, price: number): Promise<ITicket> {
    return await this.ticketRepository.createTicket({
      tournament: tournamentId,
      user: userId,
      price,
      status: 'CONFIRMED',
    });
  }

  async getMyTickets(userId: string): Promise<ITicket[]> {
    return await this.ticketRepository.getMyTickets(userId);
  }
}