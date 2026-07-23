import { promises as fs } from 'fs';
import path from 'path';
import { UserRepository } from '../repository/repository';
import { IUser } from '../../../models/User';
import { AppError } from '../../../middlewares/errorHandler';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  role: 'user' | 'admin';
  profilePicture: string | null;
  createdAt: Date;
}

export class UserService {
  private readonly userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getProfile(userId: string): Promise<UserProfile> {
    return this.requireUser(await this.userRepository.findProfileById(userId));
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      countryCode?: string;
      phoneNumber?: string;
      gender?: 'male' | 'female' | 'other';
    }
  ): Promise<UserProfile> {
    const current = this.requireUser(await this.userRepository.findProfileById(userId));
    const countryCode = data.countryCode ?? current.countryCode;
    const phoneNumber = data.phoneNumber ?? current.phoneNumber;
    if (countryCode === '+977' && !/^\d{10}$/.test(phoneNumber)) {
      throw new AppError('Nepal phone number must be exactly 10 digits', 400);
    }
    return this.requireUser(await this.userRepository.updateProfile(userId, data));
  }

  async updateProfilePicture(userId: string, newPicturePath: string): Promise<UserProfile> {
    const currentUser = await this.userRepository.findProfileById(userId);

    if (!currentUser) {
      await this.deleteLocalProfilePicture(newPicturePath);
      throw new AppError('User not found', 404);
    }

    let updatedUser: IUser | null;
    try {
      updatedUser = await this.userRepository.updateProfile(userId, {
        profilePicture: newPicturePath,
      });
    } catch (error) {
      await this.deleteLocalProfilePicture(newPicturePath);
      throw error;
    }

    if (!updatedUser) {
      await this.deleteLocalProfilePicture(newPicturePath);
      throw new AppError('User not found', 404);
    }

    if (currentUser.profilePicture && currentUser.profilePicture !== newPicturePath) {
      await this.deleteLocalProfilePicture(currentUser.profilePicture);
    }

    return this.requireUser(updatedUser);
  }

  async deleteProfilePicture(userId: string): Promise<UserProfile> {
    const currentUser = this.requireUser(
      await this.userRepository.findProfileById(userId)
    );
    const updatedUser = this.requireUser(
      await this.userRepository.updateProfile(userId, { profilePicture: null })
    );

    if (currentUser.profilePicture) {
      await this.deleteLocalProfilePicture(currentUser.profilePicture);
    }

    return updatedUser;
  }

  private requireUser(user: IUser | null): UserProfile {
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      countryCode: user.countryCode,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    };
  }

  private async deleteLocalProfilePicture(profilePicture: string): Promise<void> {
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const usersRoot = path.resolve(uploadsRoot, 'users');
    const normalizedUrlPath = profilePicture.split('?')[0].replace(/\\/g, '/');
    const expectedPrefix = '/uploads/users/';

    if (!normalizedUrlPath.startsWith(expectedPrefix)) {
      return;
    }

    const relativePath = normalizedUrlPath.slice('/uploads/'.length);
    const absolutePath = path.resolve(uploadsRoot, relativePath);

    if (!absolutePath.startsWith(`${usersRoot}${path.sep}`)) {
      return;
    }

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      const fileError = error as NodeJS.ErrnoException;
      if (fileError.code !== 'ENOENT') {
        throw new AppError('Unable to delete profile picture', 500);
      }
    }
  }
}
