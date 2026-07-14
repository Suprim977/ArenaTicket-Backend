import { Router } from 'express';
import { AdminController } from './controller';
import { authenticate } from '../../shared/middleware/auth';
import { authorize } from '../../shared/middleware/authorize';

const router = Router();
const adminController = new AdminController();

// All routes require authentication AND admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteUser);

router.get('/tournaments', adminController.getAllTournaments);
router.delete('/tournaments/:id', adminController.deleteTournament);

router.get('/tickets', adminController.getAllTickets);

router.get('/stats', adminController.getStats);

export default router;