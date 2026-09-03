import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Equipment' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'NG' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'NGN' })
  @IsString()
  @IsNotEmpty()
  base_currency: string;

  @ApiProperty({ example: 'Africa/Lagos', required: false })
  @IsString()
  timezone?: string;
}
