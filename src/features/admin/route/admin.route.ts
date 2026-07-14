import { Router } from 'express';
import { AdminController } from '../dtos/admin.controller';
import { authenticate } from '../../../middlewares/auth';
import { authorize } from '../../../middlewares/authorize';

const router = Router();
const adminController = new AdminController();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteUser);
router.get('/tournaments', adminController.getAllTournaments);
router.delete('/tournaments/:id', adminController.deleteTournament);
router.get('/stats', adminController.getStats);

export default router;