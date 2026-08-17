import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RaiseDisputeDto {
  // Short category, e.g. "work_not_completed", "no_show", "payment".
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  reason!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  detail!: string;
}

export class ResolveDisputeDto {
  @IsIn(['resolved', 'rejected'])
  status!: 'resolved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RaiseReportDto {
  @IsIn(['driver', 'customer', 'job'])
  targetType!: 'driver' | 'customer' | 'job';

  @IsString()
  @MaxLength(64)
  targetId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class ResolveReportDto {
  @IsIn(['actioned', 'dismissed'])
  status!: 'actioned' | 'dismissed';
}
