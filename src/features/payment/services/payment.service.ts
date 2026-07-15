import { Payment } from '../models/payment.model';
import { Ticket } from '../../ticket/model/ticket.model';
import { AppError } from '../../../middlewares/errorHandler';
import crypto from 'crypto';
import { CreatePaymentDTO, VerifyPaymentWebhookDTO } from '../dtos/payment.dto';

type PaymentGatewayResponse = {
  status?: string;
  [key: string]: unknown;
};

export class PaymentService {
  private normalizeWebhookStatus(status: string): 'SUCCESS' | 'FAILED' {
    const normalizedStatus = status.trim().toUpperCase();

    if (['SUCCESS', 'COMPLETE', 'COMPLETED', 'PAID', 'OK'].includes(normalizedStatus)) {
      return 'SUCCESS';
    }

    return 'FAILED';
  }

  private getWebhookSecret(gateway?: 'ESEWA' | 'KHALTI'): string {
    if (gateway === 'ESEWA') {
      return process.env.ESEWA_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || process.env.ESEWA_SECRET_KEY || 'test_secret';
    }

    if (gateway === 'KHALTI') {
      return process.env.KHALTI_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || process.env.KHALTI_SECRET_KEY || 'test_secret';
    }

    return process.env.PAYMENT_WEBHOOK_SECRET || 'test_secret';
  }

  private verifyWebhookSignature(
    transactionId: string,
    status: string,
    amount: number,
    signature: string,
    gateway?: 'ESEWA' | 'KHALTI'
  ): boolean {
    const secret = this.getWebhookSecret(gateway);
    const payload = `${transactionId}:${status}:${amount}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    return expectedSignature === signature;
  }

  async verifyPaymentWebhook(data: VerifyPaymentWebhookDTO) {
    try {
      const payment = await Payment.findOne({ transactionId: data.transactionId });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      if (Number(payment.amount) !== Number(data.amount)) {
        throw new AppError('Payment amount mismatch', 400);
      }

      const webhookGateway = data.gateway || (payment.gateway === 'ESEWA' || payment.gateway === 'KHALTI' ? payment.gateway : undefined);
      const isSignatureValid = this.verifyWebhookSignature(
        data.transactionId,
        data.status,
        data.amount,
        data.signature,
        webhookGateway
      );

      if (!isSignatureValid) {
        throw new AppError('Invalid payment signature', 401);
      }

      const nextStatus = this.normalizeWebhookStatus(data.status);
      payment.status = nextStatus;
      payment.metadata = {
        ...(payment.metadata || {}),
        webhook: {
          transactionId: data.transactionId,
          status: data.status,
          amount: data.amount,
          gateway: webhookGateway,
        },
      };

      await payment.save();

      if (nextStatus === 'SUCCESS' && payment.ticketId) {
        await Ticket.findByIdAndUpdate(payment.ticketId, {
          status: 'CONFIRMED',
        });
      }

      return {
        transactionId: payment.transactionId,
        amount: payment.amount,
        paymentStatus: payment.status,
        ticketStatus: nextStatus === 'SUCCESS' && payment.ticketId ? 'CONFIRMED' : undefined,
        gateway: webhookGateway,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Payment verification failed', 400);
    }
  }

  // Initialize eSewa payment
  async initiateEsewaPayment(data: CreatePaymentDTO, userId: string) {
    const transactionId = `ESW${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = await Payment.create({
      userId,
      ticketId: data.ticketId,
      amount: data.amount,
      gateway: 'ESEWA',
      transactionId,
      status: 'PENDING',
    });

    // eSewa configuration
    const esewaConfig = {
      amount: data.amount,
      failure_url: `${process.env.BASE_URL}/api/v1/payment/esewa/failure`,
      product_delivery_url: `${process.env.BASE_URL}/api/v1/payment/esewa/success?transactionId=${transactionId}`,
      product_code: 'EPAYTEST', // Use 'EPAY' for production
      product_service_charge: '0',
      product_delivery_charge: '0',
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature: this.generateEsewaSignature(
        data.amount,
        transactionId,
        'EPAYTEST'
      ),
    };

    return { payment, esewaConfig };
  }

  // Verify eSewa payment
  async verifyEsewaPayment(transactionId: string) {
    try {
      const response = await fetch(
        'https://rc-toyservice.epay.com.np/api/epay/transaction/status/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_uuid: transactionId,
            product_code: 'EPAYTEST',
          }),
        }
      );

      const responseData = (await response.json()) as PaymentGatewayResponse;

      const payment = await Payment.findOneAndUpdate(
        { transactionId },
        {
          status: responseData.status === 'COMPLETE' ? 'SUCCESS' : 'FAILED',
          metadata: responseData,
        },
        { new: true }
      );

      if (responseData.status === 'COMPLETE' && payment?.ticketId) {
        await Ticket.findByIdAndUpdate(payment.ticketId, {
          status: 'CONFIRMED',
        });
      }

      return payment;
    } catch (error) {
      throw new AppError('Payment verification failed', 400);
    }
  }

  // Initialize Khalti payment
  async initiateKhaltiPayment(data: CreatePaymentDTO, userId: string) {
    const transactionId = `KHT${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    const payment = await Payment.create({
      userId,
      ticketId: data.ticketId,
      amount: data.amount * 100, // Khalti uses paisa
      gateway: 'KHALTI',
      transactionId,
      status: 'PENDING',
    });

    const khaltiPayload = {
      return_url: `${process.env.BASE_URL}/api/v1/payment/khalti/success?transactionId=${transactionId}`,
      website_url: process.env.FRONTEND_URL || 'http://localhost:3000',
      amount: data.amount * 100,
      purchase_order_id: transactionId,
      purchase_order_name: 'ArenaTicket Purchase',
      customer_info: {
        name: 'Customer',
        email: 'customer@example.com',
        phone: '9800000000',
      },
    };

    return { payment, khaltiPayload };
  }

  // Verify Khalti payment
  async verifyKhaltiPayment(transactionId: string, pidx: string) {
    try {
      const response = await fetch(
        'https://a.khalti.com/api/v2/epayment/lookup/',
        {
          method: 'POST',
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pidx }),
        },
      );

      const responseData = (await response.json()) as PaymentGatewayResponse;

      const payment = await Payment.findOneAndUpdate(
        { transactionId },
        {
          status: responseData.status === 'Completed' ? 'SUCCESS' : 'FAILED',
          metadata: responseData,
        },
        { new: true }
      );

      if (responseData.status === 'Completed' && payment?.ticketId) {
        await Ticket.findByIdAndUpdate(payment.ticketId, {
          status: 'CONFIRMED',
        });
      }

      return payment;
    } catch (error) {
      throw new AppError('Khalti payment verification failed', 400);
    }
  }

  // Get payment history
  async getPaymentHistory(userId: string) {
    return await Payment.find({ userId })
      .populate('ticketId', 'title date')
      .populate('tournamentId', 'title')
      .sort({ createdAt: -1 });
  }

  // Helper: Generate eSewa signature
  private generateEsewaSignature(
    amount: number,
    transactionId: string,
    productCode: string
  ): string {
    const data = `total_amount=${amount},transaction_uuid=${transactionId},product_code=${productCode}`;
    const secret = process.env.ESEWA_SECRET_KEY || 'test_secret';
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(data).digest('base64');
  }
}