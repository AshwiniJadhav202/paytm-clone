import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@repo/db/client";
import { authOptions } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          message: "Merchant account not found",
        },
        { status: 404 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: {
        merchantId: merchant.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    });

    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      orderId: payment.razorpayOrderId,
      paymentId: payment.razorpayPaymentId ?? "N/A",
      amount: payment.amount,
      amountInRupees: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
    }));

    return NextResponse.json({
      success: true,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
      },
      payments: formattedPayments,
    });
  } catch (error) {
    console.error("RAZORPAY_PAYMENT_HISTORY_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch payment history",
      },
      { status: 500 }
    );
  }
}
