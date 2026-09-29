import { NextRequest, NextResponse } from "next/server";
import razorpay from "../../../../lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const amount = Number(body.amount);

    // Amount should be in rupees from the frontend
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          message: "Please provide a valid amount",
        },
        {
          status: 400,
        }
      );
    }

    // Convert rupees into paise
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise < 100) {
      return NextResponse.json(
        {
          message: "Minimum payment amount is ₹1",
        },
        {
          status: 400,
        }
      );
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        source: "paytm-clone",
        environment: "test",
      },
    });

    return NextResponse.json(
      {
        message: "Razorpay order created successfully",
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);

    return NextResponse.json(
      {
        message: "Failed to create Razorpay order",
      },
      {
        status: 500,
      }
    );
  }
}