import { IsString, IsEmail, IsArray, IsNumber, IsOptional, IsEnum, ValidateNested, ValidateIf, IsNotEmpty } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Localidad del cliente' })
  @IsString()
  @IsOptional()
  localidad?: string;

  @ApiPropertyOptional({ description: 'Provincia del cliente' })
  @IsString()
  @IsOptional()
  provincia?: string;

  @ApiPropertyOptional({ description: 'Código postal del cliente' })
  @IsString()
  @IsOptional()
  codigoPostal?: string;
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

  // Solo lectura: lo calcula el backend. Se acepta (y se ignora) para que el
  // front pueda reenviar los ítems de un pedido tal como los recibió.
  @ApiPropertyOptional({ description: 'Bultos (calculado por el backend, se ignora)' })
  @IsOptional()
  @IsArray()
  bultos?: { nombre: string; unidades: number }[];
}

export enum CustomerType {
  MINORISTA = 'CLIENTE_MINORISTA',
  MAYORISTA = 'CLIENTE_MAYORISTA',
}

// ---- Logística de envío (MÓDULO 3) ----
export enum ModalidadEnvio {
  RETIRO = 'RETIRO',
  FLETE = 'FLETE',
  EXPRESO = 'EXPRESO',
}

export class DireccionDto {
  @ApiProperty({ description: 'Calle y número' })
  @IsString()
  @IsNotEmpty({ message: 'La calle es obligatoria' })
  calle: string;

  @ApiPropertyOptional({ description: 'Localidad' })
  @IsString()
  @IsOptional()
  localidad?: string;

  @ApiPropertyOptional({ description: 'Provincia' })
  @IsString()
  @IsOptional()
  provincia?: string;

  @ApiPropertyOptional({ description: 'Código postal' })
  @IsString()
  @IsOptional()
  codigoPostal?: string;
}

/**
 * Modalidad logística. La validación condicional es el corte real de servidor:
 * el front puede fallar, esto no. FLETE exige entrega; EXPRESO exige despacho +
 * entrega + transporte; RETIRO no exige direcciones.
 */
export class ShippingInfoDto {
  @ApiProperty({ enum: ModalidadEnvio, description: 'Modalidad de envío elegida' })
  @IsEnum(ModalidadEnvio)
  modalidad: ModalidadEnvio;

  @ApiPropertyOptional({ type: DireccionDto, description: 'Dirección de entrega (FLETE y EXPRESO)' })
  @ValidateIf(
    (dto: ShippingInfoDto) =>
      dto.modalidad === ModalidadEnvio.FLETE ||
      dto.modalidad === ModalidadEnvio.EXPRESO,
  )
  @ValidateNested()
  @Type(() => DireccionDto)
  entrega?: DireccionDto;

  @ApiPropertyOptional({ type: DireccionDto, description: 'Dirección de despacho / depósito del expreso (EXPRESO)' })
  @ValidateIf((dto: ShippingInfoDto) => dto.modalidad === ModalidadEnvio.EXPRESO)
  @ValidateNested()
  @Type(() => DireccionDto)
  despacho?: DireccionDto;

  @ApiPropertyOptional({ description: 'Empresa de transporte (EXPRESO)' })
  @ValidateIf((dto: ShippingInfoDto) => dto.modalidad === ModalidadEnvio.EXPRESO)
  @IsString()
  @IsNotEmpty({ message: 'La empresa de transporte es obligatoria para envío por expreso' })
  transporte?: string;
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

  @ApiPropertyOptional({ description: 'Modalidad y direcciones de envío' })
  @ValidateNested()
  @Type(() => ShippingInfoDto)
  @IsOptional()
  shippingInfo?: ShippingInfoDto;

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
