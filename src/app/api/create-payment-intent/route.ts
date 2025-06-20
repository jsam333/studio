import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// This is your test secret API key.
// Remember to replace this with your actual secret key in a production environment
// and keep it secure (e.g., using environment variables).
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_SECRET_KEY', {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();

    if (!amount || amount < 100) { // Stripe requires amount in cents, and minimum is usually $0.50 or $1.00
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 