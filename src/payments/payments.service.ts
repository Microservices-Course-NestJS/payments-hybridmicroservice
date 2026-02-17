import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payments-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {

    private readonly stripe = new Stripe(envs.stripeKey)

    async createPaymentSession(paymentSessionDto: PaymentSessionDto){

        const {currency, items, orderId} = paymentSessionDto;

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
        return session;
    }


    async stripeWebhook(req: Request, res: Response) {
        const sig = req.headers['stripe-signature']!;
        // Testing
        // const endpointSecret =;
        // Real 
        const endpointSecret = envs.stripeEndpointsSecret;
        let event: Stripe.Event; 
        
        try {
            event = this.stripe.webhooks.constructEvent(req['rawBody'], sig , endpointSecret); 
        } catch (error) {
            res.status(400).send(`Webhook error ${error.message}`);
            return;
        }
        

        switch(event.type){
            case 'charge.succeeded':
                const chargeSucceeded = event.data.object;
            
                //TODO llamar nuestro microservicio
                console.log({
                    metadata: chargeSucceeded.metadata,
                    orderId: chargeSucceeded.metadata.orderId
                });
            break;
            default:
                console.log(`Event ${event.type} not handled`);
            break;
        }


        // Envía la respuesta una única vez al final
        return res.status(200).json({ sig });
    }
}
