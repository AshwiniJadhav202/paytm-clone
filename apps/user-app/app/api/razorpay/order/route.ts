
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Razorpay from "razorpay";
import prisma from "@repo/db/client";
import { authOptions } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Enter a valid amount" },
        { status: 400 }
      );
    }

    if (amount > 100000) {
      return NextResponse.json(
        { message: "Amount exceeds the test limit" },
        { status: 400 }
      );
    }

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      return NextResponse.json(
        { message: "Razorpay configuration is missing" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    // Save transaction in database
    await prisma.onRampTransaction.create({
      data: {
        provider: "Razorpay",
        status: "Processing",
        startTime: new Date(),
        token: order.id,
        userId: Number(session.user.id),
        amount: Math.round(amount * 100),
      },
    });

    return NextResponse.json({
      message: "Order created successfully",
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);

    return NextResponse.json(
      { message: "Unable to create Razorpay order" },
      { status: 500 }
    );
  }
}