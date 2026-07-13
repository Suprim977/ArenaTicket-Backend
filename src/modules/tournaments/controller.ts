import { Response, NextFunction } from 'express';
import { TournamentService } from './service';
import { createTournamentSchema } from './validation';
import { sendSuccess } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class TournamentController {
  private tournamentService: TournamentService;

  constructor() {
    this.tournamentService = new TournamentService();
  }

  createTournament = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, description, date, location, prizePool, maxTeams } = createTournamentSchema.parse(req).body;
      
      const result = await this.tournamentService.createTournament(
          { title, description, date: new Date(date), location, prizePool, maxTeams, createdBy: req.user!._id.toString() }      );
      
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