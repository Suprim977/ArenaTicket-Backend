import { Response, NextFunction } from 'express';
import { User } from '../users/model';
import { Tournament } from '../tournaments/model';
import { Ticket } from '../tickets/model';
import { sendSuccess } from '../../shared/utils/response';

export class AdminController {
  // Get all users with pagination
  getAllUsers = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const users = await User.find().select('-password').skip(skip).limit(limit);
      const total = await User.countDocuments();

      sendSuccess(res, { users, total, page, pages: Math.ceil(total / limit) }, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // Delete a user
  deleteUser = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      await User.findByIdAndDelete(id);
      
      sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // Get all tournaments
  getAllTournaments = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tournaments = await Tournament.find().populate('createdBy', 'name email');
      
      sendSuccess(res, tournaments, 'Tournaments retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // Delete a tournament
  deleteTournament = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      await Tournament.findByIdAndDelete(id);
      await Ticket.deleteMany({ tournament: id });
      
      sendSuccess(res, null, 'Tournament and associated tickets deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // Get all tickets
  getAllTickets = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tickets = await Ticket.find().populate('user', 'name email').populate('tournament', 'title date');
      
      sendSuccess(res, tickets, 'Tickets retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // Get dashboard stats
  getStats = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const totalUsers = await User.countDocuments();
      const totalTournaments = await Tournament.countDocuments();
      const totalTickets = await Ticket.countDocuments();
      
      sendSuccess(res, { totalUsers, totalTournaments, totalTickets }, 'Dashboard stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}