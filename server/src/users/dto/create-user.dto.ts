import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsUrl, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email invalide.' })
  email: string;

  @IsString()
  @MinLength(3, { message: "Le nom d'utilisateur doit faire au moins 3 caractères." })
  @MaxLength(30, { message: "Le nom d'utilisateur ne peut pas dépasser 30 caractères." })
  username: string;

  @IsString()
  @MinLength(9, { message: 'Le mot de passe doit faire au moins 9 caractères.' })
  @Matches(/\d/, { message: 'Le mot de passe doit contenir au moins un chiffre.' })
  @Matches(/[^a-zA-Z0-9]/, { message: 'Le mot de passe doit contenir au moins un caractère spécial.' })
  password: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL avatar invalide.' })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;
}
