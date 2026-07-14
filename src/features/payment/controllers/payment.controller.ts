import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middlewares/auth';
import { createPaymentDto, verifyPaymentDto } from '../dtos/payment.dto';

const paymentService = new PaymentService();

export class PaymentController {
  // Initialize payment (eSewa/Khalti)
  initiatePayment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = createPaymentDto.parse(req.body);
      const { gateway } = validatedData;

      let result;
      if (gateway === 'ESEWA') {
        result = await paymentService.initiateEsewaPayment(
          validatedData,
          req.user._id
        );
      } else if (gateway === 'KHALTI') {
        result = await paymentService.initiateKhaltiPayment(
          validatedData,
          req.user._id
        );
      }

      sendSuccess(res, result, 'Payment initiated successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  // Verify eSewa payment (callback)
  verifyEsewaPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { transactionId } = req.query;
      const payment = await paymentService.verifyEsewaPayment(
        transactionId as string
      );
      sendSuccess(res, payment, 'Payment verified successfully');
    } catch (error) {
      next(error);
    }
  };

  // Verify Khalti payment (callback)
  verifyKhaltiPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { transactionId, pidx } = req.query;
      const payment = await paymentService.verifyKhaltiPayment(
        transactionId as string,
        pidx as string
      );
      sendSuccess(res, payment, 'Payment verified successfully');
    } catch (error) {
      next(error);
    }
  };

  // Get payment history
  getPaymentHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payments = await paymentService.getPaymentHistory(req.user._id);
      sendSuccess(res, payments, 'Payment history retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}