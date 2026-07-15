export interface IUserProfile {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  profilePicture?: string;
}

export interface IUserUpdateRequest {
  name?: string;
  phone?: string;
  avatar?: string;
  profilePicture?: string;
}

export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}