jest.mock('../../models/Booking', () => ({ Booking: { findById: jest.fn() } }));
jest.mock('../../models/Payment', () => ({ Payment: { findOneAndUpdate: jest.fn(), findById: jest.fn() } }));
jest.mock('../../models/User', () => ({ User: { updateOne: jest.fn() } }));
jest.mock('../../features/ticket/service/ticket.service', () => ({
  TicketService: jest.fn().mockImplementation(() => ({ issueForBooking: jest.fn() })),
}));

import { Booking } from '../../models/Booking';
import { Payment } from '../../models/Payment';
import { User } from '../../models/User';
import { TicketService } from '../../features/ticket/service/ticket.service';
import { AppError } from '../../middlewares/errorHandler';
import { PaymentFulfillmentService, money } from '../../services/PaymentFulfillmentService';

describe('PaymentFulfillmentService', () => {
  it('rounds money to two decimals', () => {
    expect(money(10.005)).toBe(10.01);
  });

  it('rejects non-successful payments', async () => {
    await expect(new PaymentFulfillmentService().fulfillSuccessfulPayment({ status: 'pending' } as any)).rejects.toBeInstanceOf(AppError);
  });

  it('rejects missing bookings', async () => {
    (Booking.findById as jest.Mock).mockResolvedValueOnce(null);
    await expect(new PaymentFulfillmentService().fulfillSuccessfulPayment({
      status: 'success',
      bookingId: 'b1',
      userId: 'u1',
      amount: 10,
    } as any)).rejects.toMatchObject({ message: 'Booking not found' });
  });

  it('rejects mismatched users', async () => {
    (Booking.findById as jest.Mock).mockResolvedValueOnce({ userId: { toString: () => 'other' } });
    await expect(new PaymentFulfillmentService().fulfillSuccessfulPayment({
      status: 'success',
      bookingId: 'b1',
      userId: { toString: () => 'u1' },
      amount: 10,
    } as any)).rejects.toMatchObject({ message: 'Payment does not belong to this booking' });
  });

  it('rejects amount mismatches', async () => {
    (Booking.findById as jest.Mock).mockResolvedValueOnce({ userId: { toString: () => 'u1' }, totalAmount: 20 });
    await expect(new PaymentFulfillmentService().fulfillSuccessfulPayment({
      status: 'success',
      bookingId: 'b1',
      userId: { toString: () => 'u1' },
      amount: 10,
    } as any)).rejects.toMatchObject({ message: 'Payment amount mismatch' });
  });

  it('fulfills a successful payment', async () => {
    const booking = {
      userId: { toString: () => 'u1' },
      totalAmount: 10,
      status: 'pending',
      quantity: 2,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const ticket = { _id: 't1', qrCodeData: 'qr' };
    const issueForBooking = jest.fn().mockResolvedValue(ticket);
    (TicketService as jest.Mock).mockImplementation(() => ({ issueForBooking }));
    (Booking.findById as jest.Mock).mockResolvedValueOnce(booking);
    (Payment.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({ _id: 'p1', userId: { toString: () => 'u1' }, bookingId: 'b1', amount: 10, status: 'success' });
    (Payment.findById as jest.Mock).mockResolvedValueOnce({ _id: 'p1', userId: { toString: () => 'u1' }, bookingId: 'b1', amount: 10, status: 'success' });

    const result = await new PaymentFulfillmentService().fulfillSuccessfulPayment({
      _id: 'p1',
      status: 'success',
      bookingId: 'b1',
      userId: { toString: () => 'u1' },
      amount: 10,
    } as any);

    expect(result.ticket).toBe(ticket);
    expect(User.updateOne).toHaveBeenCalled();
    expect(issueForBooking).toHaveBeenCalledWith(booking);
  });
});
