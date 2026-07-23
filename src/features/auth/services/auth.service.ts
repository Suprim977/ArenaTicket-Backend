import jwt from 'jsonwebtoken';
import { AuthRepository } from '../repository/auth.repository';
import { AppError } from '../../../middlewares/errorHandler';
import { IUser } from '../../../models/User';

export type RegistrationInput = {
  firstName: string;
  lastName: string;
  countryCode: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  password: string;
};

export type SafeUser = {
  _id: string;
  firstName: string;
  lastName: string;
  name: string;
  countryCode: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  role: 'user' | 'admin';
  profilePicture: string | null;
  balance: number;
  ticketsCount: number;
  eventsAttended: number;
};

export class AuthService {
  private readonly authRepository = new AuthRepository();

  async register(data: RegistrationInput): Promise<{ user: SafeUser; token: string; tokens: { accessToken: string } }> {
    this.getJwtSecret();
    if (await this.authRepository.findByEmail(data.email)) {
      throw new AppError('Email already registered', 409);
    }
    if (await this.authRepository.findByPhone(data.countryCode, data.phoneNumber)) {
      throw new AppError('Phone number already registered for this country code', 409);
    }

    const user = await this.authRepository.createUser(data);
    const token = this.generateToken(user._id.toString());
    return { user: this.toSafeUser(user), token, tokens: { accessToken: token } };
  }

  async login(email: string, password: string): Promise<{ user: SafeUser; token: string; tokens: { accessToken: string } }> {
    const user = await this.authRepository.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }
    const token = this.generateToken(user._id.toString());
    return { user: this.toSafeUser(user), token, tokens: { accessToken: token } };
  }

  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.getJwtSecret(),
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] }
    );
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('JWT configuration is missing', 500);
    return secret;
  }

  private toSafeUser(user: IUser): SafeUser {
    return {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      countryCode: user.countryCode,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      balance: user.balance ?? 0,
      ticketsCount: user.ticketsCount ?? 0,
      eventsAttended: user.eventsAttended ?? 0,
    };
  }
}
