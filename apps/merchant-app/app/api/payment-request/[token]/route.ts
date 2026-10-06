import { NextResponse } from "next/server";

import prisma from "@repo/db/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    token: string;
  };
};

export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { token } = context.params;

    if (!token) {
      return NextResponse.json(
        {
          message: "Payment token is required",
        },
        {
          status: 400,
        }
      );
    }

    const paymentRequest = await prisma.payment.findUnique({
      where: {
        razorpayOrderId: token,
      },

      include: {
        Merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!paymentRequest) {
      return NextResponse.json(
        {
          message: "Payment request not found",
        },
        {
          status: 404,
        }
      );
    }

    // Only PENDING requests are active
    if (paymentRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          message:
            "This payment request is no longer active",
          status: paymentRequest.status,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        message: "Payment request fetched successfully",

        paymentRequest: {
          id: paymentRequest.id,

          merchantId: paymentRequest.merchantId,

          merchantName:
            paymentRequest.Merchant?.name ||
            paymentRequest.Merchant?.email ||
            "Merchant",

          merchantEmail:
            paymentRequest.Merchant?.email || null,

          amount: paymentRequest.amount,

          amountInRupees: paymentRequest.amount,

          description: null,

          token: paymentRequest.razorpayOrderId,

          status: paymentRequest.status,

          currency: paymentRequest.currency,

          createdAt: paymentRequest.createdAt,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "FETCH_PAYMENT_REQUEST_ERROR:",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to fetch payment request",
      },
      {
        status: 500,
      }
    );
  }
}