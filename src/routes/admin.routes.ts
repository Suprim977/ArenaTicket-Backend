import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';

const router = Router();
const controller = new AdminController();

router.use(authenticate, authorize('admin'));
router.get('/dashboard', asyncHandler(controller.dashboard));
router.get('/users', asyncHandler(controller.listUsers));
router.get('/users/:id', asyncHandler(controller.getUser));
router.patch('/users/:id', asyncHandler(controller.updateUser));
router.delete('/users/:id', asyncHandler(controller.deleteUser));
router.get('/bookings', asyncHandler(controller.listBookings));
router.get('/bookings/:identifier', asyncHandler(controller.getBooking));
router.patch('/bookings/:identifier/status', asyncHandler(controller.updateBookingStatus));

export default router;
