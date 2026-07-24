import { Ticket, ITicket } from '../model/ticket.model';

export class TicketRepository {
  create(data: Partial<ITicket>): Promise<ITicket> {
    return Ticket.create(data);
  }

  findByBooking(bookingId: string): Promise<ITicket | null> {
    return Ticket.findOne({ bookingId });
  }

  findByToken(qrToken: string): Promise<ITicket | null> {
    return Ticket.findOne({ qrToken });
  }

  getForUser(userId: string): Promise<ITicket[]> {
    return Ticket.find({ userId })
      .populate('eventId', 'title slug date location venue stadium imageUrl')
      .populate('bookingId', 'bookingRef status totalAmount paymentMethod')
      .sort({ createdAt: -1 });
  }

  getAll(): Promise<ITicket[]> {
    return Ticket.find()
      .populate('eventId', 'title slug date location venue stadium imageUrl')
      .populate('userId', 'firstName lastName email')
      .populate('bookingId', 'bookingRef status totalAmount paymentMethod')
      .sort({ createdAt: -1 });
  }
}
