import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkSessionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  deployment_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  operator_id: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  helper_id?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  start_at: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  end_at?: string;

  @ApiProperty()
  start_meter: number;

  @ApiPropertyOptional()
  end_meter?: number;

  @ApiPropertyOptional()
  units_run?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  start_photo_key?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  end_photo_key?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  start_evidence?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  end_evidence?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  activity?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  billable?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  override_reason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  client_uuid: string;
}
