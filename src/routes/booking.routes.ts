import { Router } from 'express';
import { BookingController } from '../controllers/BookingController';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new BookingController();
router.use(authenticate);
router.post('/', asyncHandler(controller.create));
router.get('/my-bookings', asyncHandler(controller.myBookings));
router.get('/:bookingRef', asyncHandler(controller.getOne));
export default router;
