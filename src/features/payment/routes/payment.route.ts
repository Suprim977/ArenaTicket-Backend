import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();
const paymentController = new PaymentController();

// Protected routes
router.use(authenticate);

// Initiate payment
router.post('/initiate', paymentController.initiatePayment);

// Get payment history
router.get('/history', paymentController.getPaymentHistory);

// Payment callbacks (public - called by payment gateways)
router.get('/esewa/success', paymentController.verifyEsewaPayment);
router.get('/esewa/failure', (req, res) => {
  res.status(400).json({ success: false, message: 'Payment failed' });
});

router.get('/khalti/success', paymentController.verifyKhaltiPayment);
router.get('/khalti/failure', (req, res) => {
  res.status(400).json({ success: false, message: 'Payment failed' });
});

export default router;