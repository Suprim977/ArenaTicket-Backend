import { User, IUser } from './model';

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id).select('+password');
  }

  async updateProfile(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
}