import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Razorpay from "razorpay";

import prisma from "@repo/db/client";
import { authOptions } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please login first" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const amountInRupees = Number(body.amount);

    if (
      !Number.isFinite(amountInRupees) ||
      amountInRupees <= 0
    ) {
      return NextResponse.json(
        { message: "Please enter a valid amount" },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(amountInRupees * 100);

    if (amountInPaise <= 0) {
      return NextResponse.json(
        { message: "Invalid payment amount" },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findFirst({
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { message: "No merchant account found" },
        { status: 404 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { message: "Razorpay configuration is missing" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    await prisma.payment.create({
  data: {
    razorpayOrderId: order.id,
    amount: amountInRupees,
    currency: "INR",
    status: "PENDING",
    merchantId: merchant.id,
    updatedAt: new Date(),
  },
});

    return NextResponse.json(
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("RAZORPAY_ORDER_ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to create Razorpay order",
      },
      { status: 500 }
    );
  }
}