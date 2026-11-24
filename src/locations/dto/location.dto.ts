import { IsArray, IsDateString, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../common/pagination/page-query.dto';

export class LocationDto {
  @IsLatitude() latitude: number;
  @IsLongitude() longitude: number;
  @IsDateString() timestamp: string;
  @IsOptional() @IsNumber() accuracy?: number;
  @IsOptional() @IsNumber() speed?: number;
  @IsOptional() @IsNumber() heading?: number;

  /** Accepted for older clients; visibility is always computed on the server. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whoCanSeeLocation?: string[];
}

export class LocationHistoryQueryDto extends PageQueryDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}
