import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentSessionDto } from './dto/payments-session.dto';
import type { Request, Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}


  @Post('create-payments-session')
  createPaymentSession(
    @Body() paymentSessionDto: PaymentSessionDto
  ){
    return this.paymentsService.createPaymentSession(paymentSessionDto);
  }

  @Get('success')
  success(){
    return {
      ok: true,
      message: 'Payment successful'
    }
  }
  
  @Get('cancel')
  cancell(){
    return {
      payment: 'cancelled'
    }
  }

  @Post('webhook')
  async stripeWebhook(
    @Req() req: Request,
    @Res() res: Response
    ){
    await this.paymentsService.stripeWebhook(req, res);
  }
}
