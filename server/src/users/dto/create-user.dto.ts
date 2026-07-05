export class CreateUserDto {
  email: string;
  username: string;
  password: string;
  avatarUrl?: string;
  bio?: string;
}
