import { IUser } from '../../user/model/user.model';

export interface IAuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface IAuthResponse {
  user: IUser;
  tokens: IAuthTokens;
}