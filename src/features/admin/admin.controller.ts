import { Response, NextFunction } from 'express';
import { User } from '../user/user.model';
import { Tournament } from '../tournament/tournament.model';
import { Ticket } from '../ticket/ticket.model';
import { sendSuccess } from '../../utils/response';

export class AdminController {
  getAllUsers = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await User.find().select('-password');
      sendSuccess(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      await User.findByIdAndDelete(req.params.id);
      sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getAllTournaments = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tournaments = await Tournament.find();
      sendSuccess(res, tournaments, 'Tournaments retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteTournament = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Tournament.findByIdAndDelete(req.params.id);
      sendSuccess(res, null, 'Tournament deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const totalUsers = await User.countDocuments();
      const totalTournaments = await Tournament.countDocuments();
      const totalTickets = await Ticket.countDocuments();
      sendSuccess(res, { totalUsers, totalTournaments, totalTickets }, 'Stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}