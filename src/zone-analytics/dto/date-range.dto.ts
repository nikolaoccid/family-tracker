import { IsOptional, Matches } from 'class-validator';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class DateRangeDto {
  @IsOptional()
  @Matches(DAY, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @Matches(DAY, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;
}
