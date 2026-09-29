import { NextResponse } from "next/server";
import prisma from "@repo/db/client";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { token } = await context.params;

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

    const paymentRequest =
      await prisma.merchantPaymentRequest.findUnique({
        where: {
          token: token,
        },
        include: {
          merchant: {
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

    if (paymentRequest.status !== "Pending") {
      return NextResponse.json(
        {
          message: "This payment request is no longer active",
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
            paymentRequest.merchant.name ||
            paymentRequest.merchant.email,

          merchantEmail: paymentRequest.merchant.email,

          amount: paymentRequest.amount,

          amountInRupees: paymentRequest.amount / 100,

          description: paymentRequest.description,

          token: paymentRequest.token,

          status: paymentRequest.status,

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