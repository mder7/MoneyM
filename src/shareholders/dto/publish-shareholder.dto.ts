import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class PublishShareholderDto {
  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @IsNumber()
  @Min(0)
  ownershipShare: number;

  @IsNumber()
  @Min(0)
  preferredShare: number;
}
