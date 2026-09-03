import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMachineDto {
  @ApiProperty({ example: 'EXC-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'excavator' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: 'Caterpillar' })
  @IsString()
  @IsOptional()
  make?: string;

  @ApiPropertyOptional({ example: '320F' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ example: 2020 })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  chassis_no?: string;

  @ApiProperty({ example: 'hours' })
  @IsString()
  @IsNotEmpty()
  primary_meter_type: string;

  @ApiProperty({ example: 'hours' })
  @IsString()
  @IsNotEmpty()
  meter_unit_label: string;

  @ApiProperty()
  @IsUUID()
  client_uuid: string;
}
