import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '../../user/user.enum';

export class RolePricingItemDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  rol: UserRole;

  @ApiProperty({ description: 'Recargo porcentual (negativo = descuento)', example: 10 })
  @IsNumber()
  @Min(-100)
  @Max(1000)
  percentage: number;
}

export class UpdateRolePricingDto {
  @ApiProperty({ type: [RolePricingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePricingItemDto)
  items: RolePricingItemDto[];
}
