import { IsString, IsEmail, IsArray, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactInfoDto {
  @ApiProperty({ description: 'Nombre completo del cliente' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Email del cliente' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Teléfono del cliente' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Dirección de envío' })
  @IsString()
  address: string;
}

export class BusinessInfoDto {
  @ApiProperty({ description: 'CUIT del cliente mayorista' })
  @IsString()
  cuit: string;

  @ApiPropertyOptional({ description: 'Razón social' })
  @IsString()
  @IsOptional()
  razonSocial?: string;

  @ApiProperty({ description: 'Situación ante AFIP' })
  @IsString()
  situacionAfip: string;

  @ApiPropertyOptional({ description: 'Código postal' })
  @IsString()
  @IsOptional()
  codigoPostal?: string;
}

export class OrderItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsNumber()
  @Type(() => Number)
  productId: number;

  @ApiProperty({ description: 'Nombre del producto' })
  @IsString()
  productName: string;

  @ApiProperty({ description: 'Cantidad' })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Precio unitario' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Presentación del producto (e.g., "Balde 20 Litros")' })
  @IsString()
  @IsOptional()
  presentation?: string;
}

export enum CustomerType {
  MINORISTA = 'CLIENTE_MINORISTA',
  MAYORISTA = 'CLIENTE_MAYORISTA',
}

export class SendOrderEmailDto {
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
  @Type(() => Number)
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
