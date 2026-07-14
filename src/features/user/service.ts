import bcrypt from 'bcryptjs';
import { UserRepository } from './repository';
import { IUser } from './model';
import { AppError } from '../../middlewares/errorHandler';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async updateProfile(userId: string, name: string): Promise<IUser | null> {
    return await this.userRepository.updateProfile(userId, { name });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await this.userRepository.updateProfile(userId, { password: hashedPassword });
  }
}