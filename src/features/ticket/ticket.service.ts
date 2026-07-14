import mongoose from 'mongoose';
import { TicketRepository } from './repository';
import { ITicket } from './ticket.model';

export class TicketService {
  private ticketRepository: TicketRepository;

  constructor() {
    this.ticketRepository = new TicketRepository();
  }

  async bookTicket(tournamentId: string, userId: string, price: number): Promise<ITicket> {
    return await this.ticketRepository.createTicket({
      tournament: new mongoose.Types.ObjectId(tournamentId),
      user: new mongoose.Types.ObjectId(userId),
      price,
      status: 'CONFIRMED',
    });
  }

  async getMyTickets(userId: string): Promise<ITicket[]> {
    return await this.ticketRepository.getMyTickets(userId);
  }
}