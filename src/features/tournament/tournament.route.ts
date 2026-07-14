import { Router } from 'express';
import { TournamentController } from './tournament.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();
const tournamentController = new TournamentController();

router.get('/', tournamentController.getAllTournaments);
router.post('/', authenticate, tournamentController.createTournament);

export default router;