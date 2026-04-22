import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session with free trial
    // Card is required upfront but not charged until trial ends
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          supabase_user_id: userId,
        },
      },
      // This forces card collection during trial
      payment_method_collection: 'always',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?canceled=true`,
      metadata: {
        supabase_user_id: userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}