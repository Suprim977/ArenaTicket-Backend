import { Response, NextFunction } from 'express';
import { User } from '../../user/model/user.model';
import { Tournament } from '../../tournament/model/tournament.model';
import { Ticket } from '../../ticket/model/ticket.model';
import { sendSuccess } from '../../../utils/response';
import { AuthService } from '../../auth/services/auth.service';
import { AppError } from '../../../middlewares/errorHandler';

export class AdminController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login({ email, password });

      if (result.user.role !== 'ADMIN') {
        return next(new AppError('You do not have permission to perform this action', 403));
      }

      sendSuccess(res, result, 'Admin login successful');
    } catch (error) {
      next(error);
    }
  };

  createUser = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, role = 'USER' } = req.body;
      const normalizedEmail = String(email).trim().toLowerCase();

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return next(new AppError('Email already registered', 409));
      }

      const user = await User.create({
        name,
        email: normalizedEmail,
        password,
        role,
      });

      const { password: _password, ...userObj } = user.toObject();
      sendSuccess(res, userObj, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

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