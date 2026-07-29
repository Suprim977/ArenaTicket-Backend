import { User, IUser } from '../../../models/User';

export class AuthRepository {
  async createUser(
    userData: Pick<IUser, 'firstName' | 'lastName' | 'countryCode' | 'phoneNumber' | 'gender' | 'email' | 'password' | 'role'>,
  ): Promise<IUser> {
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

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      },
    );
  }

  async consumePasswordResetToken(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<IUser | null> {
    return User.findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: now },
      },
      {
        $set: { password: passwordHash },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
  }
}
