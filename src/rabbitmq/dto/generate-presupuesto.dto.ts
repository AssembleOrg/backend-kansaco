import { IsString, IsEmail, IsArray, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactInfoDto, BusinessInfoDto, OrderItemDto, CustomerType } from '../../email/dto/send-order-email.dto';

export class GeneratePresupuestoDto {
  @ApiProperty({
    description: 'Tipo de cliente',
    enum: CustomerType
  })
  @IsEnum(CustomerType)
  customerType: CustomerType;

  @ApiProperty({ description: 'Información de contacto' })
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo: ContactInfoDto;

  @ApiPropertyOptional({ description: 'Información fiscal (solo mayoristas)' })
  @ValidateNested()
  @Type(() => BusinessInfoDto)
  @IsOptional()
  businessInfo?: BusinessInfoDto;

  @ApiProperty({ description: 'Items del pedido', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Monto total' })
  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Número de presupuesto (si no se proporciona, se genera automáticamente)' })
  @IsString()
  @IsOptional()
  presupuestoNumber?: string;

  @ApiPropertyOptional({ description: 'Email del asistente de ventas (si no se proporciona, usa EMAIL_TO)' })
  @IsEmail()
  @IsOptional()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'ID de la orden generada' })
  @IsString()
  @IsOptional()
  orderId?: string;
}

