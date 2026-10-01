import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShareholderDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsInt()
  creatorId: number;
}
