import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { TicketService } from '../features/ticket/service/ticket.service';

const run = async (): Promise<void> => {
  await connectDatabase();
  const ticketService = new TicketService();
  const payments = await Payment.find({ status: 'success' });
  let backfilled = 0;

  for (const payment of payments) {
    const booking = await Booking.findById(payment.bookingId);
    if (!booking || booking.status !== 'confirmed') continue;
    const ticket = await ticketService.issueForBooking(booking);
    await Promise.all([
      Booking.updateOne({ _id: booking._id }, { $set: { qrCodeData: ticket.qrCodeData } }),
      Payment.updateOne(
        { _id: payment._id },
        {
          $set: {
            ticketId: ticket._id,
            fulfilledAt: payment.fulfilledAt ?? new Date(),
          },
        },
      ),
    ]);
    backfilled += 1;
  }

  console.log(`Ensured persistent tickets for ${backfilled} successful payment(s).`);
};

run()
  .catch(error => {
    console.error('Ticket backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
