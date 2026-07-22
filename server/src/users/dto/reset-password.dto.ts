import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(9, { message: 'Le mot de passe doit faire au moins 9 caractères.' })
  @Matches(/\d/, { message: 'Le mot de passe doit contenir au moins un chiffre.' })
  @Matches(/[^a-zA-Z0-9]/, { message: 'Le mot de passe doit contenir au moins un caractère spécial.' })
  newPassword: string;
}
