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
      .populate({
        path: 'bookingId',
        select: 'bookingRef status totalAmount paymentMethod',
        populate: {
          path: 'payment',
          select: 'method amount status transactionRef',
        },
      })
      .sort({ createdAt: -1 });
  }

  getAll(): Promise<ITicket[]> {
    return Ticket.find()
      .populate('eventId', 'title slug date location venue stadium imageUrl')
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate({
        path: 'bookingId',
        select: 'bookingRef status totalAmount paymentMethod',
        populate: {
          path: 'payment',
          select: 'method amount status transactionRef',
        },
      })
      .sort({ createdAt: -1 });
  }
}
