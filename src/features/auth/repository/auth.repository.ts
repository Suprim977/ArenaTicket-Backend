import { User, IUser } from '../../../models/User';

export class AuthRepository {
  async createUser(userData: Pick<IUser, 'firstName' | 'lastName' | 'countryCode' | 'phoneNumber' | 'gender' | 'email' | 'password'>): Promise<IUser> {
    return await User.create(userData);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  }

  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  async findByPhone(countryCode: string, phoneNumber: string): Promise<IUser | null> {
    return await User.findOne({ countryCode, phoneNumber });
  }
}
