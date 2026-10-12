import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../order.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Nuevo estado de la orden',
    enum: OrderStatus,
    example: OrderStatus.RECIBIDO,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    description:
      'Motivo de la cancelación (solo con CANCELADO). Se anexa a la nota interna; el cliente no lo ve.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
