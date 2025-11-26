import { Controller, Logger, UseInterceptors } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RabbitmqService } from './rabbitmq.service';
import { GeneratePresupuestoDto } from './dto/generate-presupuesto.dto';

@Controller()
export class RabbitmqController {
  private readonly logger = new Logger(RabbitmqController.name);

  constructor(private readonly rabbitmqService: RabbitmqService) {}

  @EventPattern('generate-presupuesto')
  async handleGeneratePresupuesto(
    @Payload() data: GeneratePresupuestoDto,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received generate-presupuesto job`);
    return await this.rabbitmqService.generateAndSendPresupuesto(data);
  }
}

