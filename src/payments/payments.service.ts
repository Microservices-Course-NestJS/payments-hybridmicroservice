import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs, NATS_SERVICE } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payments-session.dto';
import { Request, Response } from 'express';
import { ClientProxy, RpcException } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {

    constructor(
        @Inject(NATS_SERVICE)
        private readonly Client: ClientProxy
    ){}

    private readonly stripe = new Stripe(envs.stripeKey)
    private readonly logger = new Logger('PaymentsService')
    async createPaymentSession(paymentSessionDto: PaymentSessionDto) {

        const { currency, items, orderId } = paymentSessionDto;

        const line_items = items.map(item => {
            return {
                price_data: {
                    currency: currency,
                    product_data: {
                        name: item.name
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity
            }
        })
        try {
            const session = await this.stripe.checkout.sessions.create({
                //Colocar aqui el ID de mi orden
                payment_intent_data: {
                    metadata: {
                        orderId
                    }
                },
                line_items,
                mode: 'payment',
                success_url: envs.stripeSuccessUrl,
                cancel_url: envs.stripeCancelUrl
            });
            return {
                cancelUrl: session.cancel_url,
                successUrl: session.success_url,
                url: session.url
            };
        } catch (error) {
            throw new RpcException({
                message: `Error al crear la sesion de pago`,
                status: 500
            })
        }
    }


    async stripeWebhook(req: Request, res: Response) {
        const sig = req.headers['stripe-signature']!;
        // Testing
        // const endpointSecret =;
        // Real 
        const endpointSecret = envs.stripeEndpointsSecret;
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(req['rawBody'], sig, endpointSecret);
        } catch (error) {
            res.status(400).send(`Webhook error ${error.message}`);
            return;
        }


        switch (event.type) {
            case 'charge.succeeded':
                const chargeSucceeded = event.data.object;

                //TODO llamar nuestro microservicio
                console.log({
                    metadata: chargeSucceeded.metadata,
                    orderId: chargeSucceeded.metadata.orderId //Con esto ya se puede acceder a la orden y cambiarle el estado mediante le microservicio de orders
                });
                const payload = {
                    stripePaymentId: chargeSucceeded.id,
                    orderId: chargeSucceeded.metadata.orderId,
                    receiptUrl: chargeSucceeded.receipt_url,
                }
                this.Client.emit('payment.succeeded',payload);
                break;
            default:
                console.log(`Event ${event.type} not handled`);
                break;
        }


        // Envía la respuesta una única vez al final
        return res.status(200).json({ sig });
    }
}
