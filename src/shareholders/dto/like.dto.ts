import { IsIn } from 'class-validator';

export class LikeDto {
  @IsIn([0, 1])
  value: 0 | 1;
}