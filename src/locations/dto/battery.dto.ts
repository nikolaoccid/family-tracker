import { IsNumber, Max, Min } from 'class-validator';

export class UpdateBatteryDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  level: number;
}
