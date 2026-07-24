import { Booking, IBooking } from '../models/Booking';
import { IPayment, Payment } from '../models/Payment';
import { User } from '../models/User';
import { ITicket } from '../features/ticket/model/ticket.model';
import { TicketService } from '../features/ticket/service/ticket.service';
import { AppError } from '../middlewares/errorHandler';

export class PaymentFulfillmentService {
  private readonly ticketService = new TicketService();

  async fulfillSuccessfulPayment(payment: IPayment): Promise<{
    payment: IPayment;
    booking: IBooking;
    ticket: ITicket;
  }> {
    const booking = await Booking.findById(payment.bookingId);
    if (!booking) throw new AppError('Booking not found', 404);
    if (money(payment.amount) !== money(booking.totalAmount)) {
      throw new AppError('Payment amount mismatch', 400);
    }
    if (booking.status === 'cancelled') {
      throw new AppError('Cancelled booking cannot be fulfilled', 409);
    }
    if (booking.status !== 'confirmed') {
      booking.status = 'confirmed';
      await booking.save();
    }

    const ticket = await this.ticketService.issueForBooking(booking);
    booking.qrCodeData = ticket.qrCodeData;
    await booking.save();

    const firstFulfillment = await Payment.findOneAndUpdate(
      { _id: payment._id, fulfilledAt: { $exists: false } },
      { $set: { ticketId: ticket._id, fulfilledAt: new Date() } },
      { new: true },
    );
    if (firstFulfillment) {
      await User.updateOne(
        { _id: payment.userId },
        { $inc: { ticketsCount: booking.quantity } },
      );
      payment = firstFulfillment;
    } else {
      payment = await Payment.findById(payment._id) ?? payment;
    }

    return { payment, booking, ticket };
  }
}

export const money = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;
