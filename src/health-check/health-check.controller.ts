import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class HealthCheckController {
  constructor() {}

  @Get()
  healthCheck(): string {
    return 'Payments webhook is running and healthy!';
  }


}
