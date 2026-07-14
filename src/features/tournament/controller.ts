import { Response, NextFunction } from 'express';
import { TournamentService } from './service';
import { createTournamentSchema } from './validation';
import { sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth';

export class TournamentController {
  private tournamentService: TournamentService;

  constructor() {
    this.tournamentService = new TournamentService();
  }

  createTournament = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate req.body directly
      const data = createTournamentSchema.parse(req.body);
      
      const result = await this.tournamentService.createTournament(
        data.title,
        data.description,
        new Date(data.date),
        data.location,
        data.prizePool,
        data.maxTeams,
        req.user!._id.toString()
      );
      
      sendSuccess(res, result, 'Tournament created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getAllTournaments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.tournamentService.getAllTournaments();
      sendSuccess(res, result, 'Tournaments retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}