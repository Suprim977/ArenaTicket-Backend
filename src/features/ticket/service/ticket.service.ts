import { randomBytes, randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { Booking, IBooking } from '../../../models/Booking';
import { AppError } from '../../../middlewares/errorHandler';
import { generateQrCode } from '../../../utils/qrCode';
import { ITicket } from '../model/ticket.model';
import { TicketRepository } from '../repository/repository';

export class TicketService {
  private readonly ticketRepository = new TicketRepository();

  async issueForBooking(booking: IBooking): Promise<ITicket> {
    const existing = await this.ticketRepository.findByBooking(booking._id.toString());
    if (existing) return existing;
    if (booking.status !== 'confirmed') {
      throw new AppError('Ticket can only be issued for a confirmed booking', 409);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ticketId = new mongoose.Types.ObjectId();
      const qrToken = randomBytes(32).toString('hex');
      const qrCodeData = await generateQrCode({
        ticketId: ticketId.toString(),
        bookingId: booking._id.toString(),
        token: qrToken,
      });
      try {
        return await this.ticketRepository.create({
          _id: ticketId,
          userId: booking.userId,
          bookingId: booking._id,
          eventId: booking.eventId,
          ticketNumber: this.generateTicketNumber(),
          ticketTier: /^vip$/i.test(booking.tier) ? 'vip' : 'normal',
          section: booking.section?.trim() || 'General Admission',
          quantity: booking.quantity,
          qrToken,
          qrCodeData,
          status: 'valid',
        });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000 || attempt === 4) throw error;
        const concurrentTicket = await this.ticketRepository.findByBooking(booking._id.toString());
        if (concurrentTicket) return concurrentTicket;
      }
    }
    throw new AppError('Unable to generate a unique ticket', 409);
  }

  async getMyTickets(userId: string): Promise<ITicket[]> {
    return this.ticketRepository.getForUser(userId);
  }

  async getAllTickets(): Promise<ITicket[]> {
    return this.ticketRepository.getAll();
  }

  async verify(qrToken: string): Promise<ITicket> {
    const ticket = await this.ticketRepository.findByToken(qrToken);
    if (!ticket) throw new AppError('Ticket not found', 404);
    if (ticket.status !== 'valid') throw new AppError('Ticket is not valid', 409);
    const booking = await Booking.findById(ticket.bookingId);
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'confirmed') {
      throw new AppError('Ticket booking is not confirmed', 409);
    }
    return ticket.populate('eventId', 'title slug date location venue stadium');
  }

  private generateTicketNumber(): string {
    const year = new Date().getFullYear();
    return `AT-${year}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
  }
}
