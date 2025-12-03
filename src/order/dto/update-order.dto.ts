import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  ValidateNested,
  IsString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContactInfoDto, BusinessInfoDto, OrderItemDto } from '../../email/dto/send-order-email.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Información de contacto actualizada',
    type: ContactInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto;

  @ApiPropertyOptional({
    description: 'Información fiscal actualizada (solo para mayoristas)',
    type: BusinessInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessInfoDto)
  businessInfo?: BusinessInfoDto;

  @ApiPropertyOptional({
    description: 'Items actualizados del pedido',
    type: [OrderItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ApiPropertyOptional({
    description: 'Notas del pedido actualizadas',
    example: 'Entregar por la mañana',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
