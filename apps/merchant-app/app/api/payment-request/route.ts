import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@repo/db/client";
import razorpay from "../../../lib/razorpay";
import { authOptions } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body = await req.json();

    const amount = Number(body.amount);
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid amount",
        },
        {
          status: 400,
        }
      );
    }

    if (amount > 100000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Maximum payment request amount is ₹100000",
        },
        {
          status: 400,
        }
      );
    }

    const amountInRupees = Math.round(amount);
    const amountInPaise = amountInRupees * 100;

    if (amountInPaise < 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Minimum payment amount is ₹1",
        },
        {
          status: 400,
        }
      );
    }

    // Find the logged-in merchant
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
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // Create the REAL Razorpay order
    // --------------------------------------------------

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `payment_request_${Date.now()}`,
      notes: {
        source: "paytm-clone",
        type: "payment-request",
        merchantId: String(merchant.id),
        description: description || "Payment Request",
      },
    });

    // --------------------------------------------------
    // Save the REAL Razorpay order ID in Payment
    // --------------------------------------------------

    const paymentRequest = await prisma.payment.create({
      data: {
        merchantId: merchant.id,

        razorpayOrderId: razorpayOrder.id,

        amount: amountInRupees,

        currency: "INR",

        status: "PENDING",

        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,

        message: "Payment request created successfully",

        paymentRequest: {
          id: paymentRequest.id,

          token: paymentRequest.razorpayOrderId,

          razorpayOrderId:
            paymentRequest.razorpayOrderId,

          amount: paymentRequest.amount,

          amountInRupees:
            paymentRequest.amount,

          currency: paymentRequest.currency,

          status: paymentRequest.status,

          description:
            description || null,

          merchant: {
            id: merchant.id,
            name: merchant.name,
            email: merchant.email,
          },

          paymentUrl:
            `/payment-request/${paymentRequest.razorpayOrderId}`,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "PAYMENT_REQUEST_CREATE_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create payment request",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
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
        {
          status: 404,
        }
      );
    }

    const paymentRequests =
      await prisma.payment.findMany({
        where: {
          merchantId: merchant.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          razorpayOrderId: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,

      paymentRequests:
        paymentRequests.map((request) => ({
          id: request.id,

          token: request.razorpayOrderId,

          razorpayOrderId:
            request.razorpayOrderId,

          amount: request.amount,

          amountInRupees:
            request.amount,

          currency:
            request.currency,

          status:
            request.status,

          createdAt:
            request.createdAt,

          updatedAt:
            request.updatedAt,

          paymentUrl:
            `/payment-request/${request.razorpayOrderId}`,
        })),
    });
  } catch (error) {
    console.error(
      "PAYMENT_REQUEST_LIST_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to fetch payment requests",
      },
      {
        status: 500,
      }
    );
  }
}