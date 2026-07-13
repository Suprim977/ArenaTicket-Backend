import { Router } from 'express';
import { TournamentController } from './controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();
const tournamentController = new TournamentController();

router.get('/', tournamentController.getAllTournaments);
router.post('/', authenticate, tournamentController.createTournament);

export default router;