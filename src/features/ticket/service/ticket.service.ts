import mongoose from 'mongoose';
import { TicketRepository } from '../repository/repository';
import { ITicket } from '../model/ticket.model';

export class TicketService {
  private ticketRepository: TicketRepository;

  constructor() {
    this.ticketRepository = new TicketRepository();
  }

  async bookTicket(tournamentId: string, userId: string, quantity: number): Promise<ITicket> {
    const unitPrice = Number(process.env.TICKET_UNIT_PRICE || 1000);

    return await this.ticketRepository.createTicket({
      tournament: new mongoose.Types.ObjectId(tournamentId),
      user: new mongoose.Types.ObjectId(userId),
      quantity,
      totalPrice: quantity * unitPrice,
      status: 'CONFIRMED',
    });
  }

  async getMyTickets(userId: string): Promise<ITicket[]> {
    return await this.ticketRepository.getMyTickets(userId);
  }
}