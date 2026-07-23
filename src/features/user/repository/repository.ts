import { User, IUser } from '../../../models/User';

export type ProfileUpdate = Partial<Pick<IUser, 'firstName' | 'lastName' | 'countryCode' | 'phoneNumber' | 'gender' | 'profilePicture'>>;

export class UserRepository {
  async findProfileById(id: string): Promise<IUser | null> {
    return User.findById(id).select(
      'firstName lastName countryCode phoneNumber gender email role profilePicture createdAt'
    );
  }

  async updateProfile(id: string, data: ProfileUpdate): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: data }, {
      new: true,
      runValidators: true,
    }).select('firstName lastName countryCode phoneNumber gender email role profilePicture createdAt');
  }
}
