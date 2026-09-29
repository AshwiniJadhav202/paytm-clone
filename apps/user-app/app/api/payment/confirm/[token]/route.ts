
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import prisma from "@repo/db/client";
import { authOptions } from "../../../../lib/auth";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Verify logged-in user
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          message: "Please login to make payment",
        },
        {
          status: 401,
        }
      );
    }

    // Find the actual database user using email
    const userEmail = session.user.email.toLowerCase();

    // 2. Read PIN from request body
    const body = await request.json();
    const pin = body.pin;

    if (
      typeof pin !== "string" ||
      !/^\d{4,6}$/.test(pin)
    ) {
      return NextResponse.json(
        {
          message: "Valid 4–6 digit Payment PIN is required",
        },
        {
          status: 400,
        }
      );
    }

    // 3. Get payment token
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

    // 4. Fetch user using email
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
      select: {
        id: true,
        balancePin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "User account not found",
        },
        {
          status: 404,
        }
      );
    }

    // Use the actual database user ID
    const userId = user.id;

    if (!user.balancePin) {
      return NextResponse.json(
        {
          message:
            "Payment PIN is not configured for this account",
        },
        {
          status: 400,
        }
      );
    }

    // 5. Verify Payment PIN
    const isPinValid = await bcrypt.compare(
      pin,
      user.balancePin
    );

    if (!isPinValid) {
      return NextResponse.json(
        {
          message: "Incorrect Payment PIN",
        },
        {
          status: 401,
        }
      );
    }

    // 6. Process payment in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      const paymentRequest =
        await tx.merchantPaymentRequest.findUnique({
          where: {
            token,
          },
        });

      if (!paymentRequest) {
        throw new Error("PAYMENT_REQUEST_NOT_FOUND");
      }

      if (paymentRequest.status !== "Pending") {
        throw new Error("PAYMENT_REQUEST_NOT_PENDING");
      }

      // Deduct only when sufficient balance exists
      const balanceUpdate = await tx.balance.updateMany({
        where: {
          userId,
          amount: {
            gte: paymentRequest.amount,
          },
        },
        data: {
          amount: {
            decrement: paymentRequest.amount,
          },
        },
      });

      if (balanceUpdate.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Update request only while it is pending
      const updatedRequest =
        await tx.merchantPaymentRequest.updateMany({
          where: {
            id: paymentRequest.id,
            status: "Pending",
          },
          data: {
            status: "Success",
            paidByUserId: userId,
            paidAt: new Date(),
          },
        });

      if (updatedRequest.count === 0) {
        throw new Error("PAYMENT_ALREADY_PROCESSED");
      }

      return {
        requestId: paymentRequest.id,
        amount: paymentRequest.amount,
      };
    });

    // 7. Return successful payment response
    return NextResponse.json(
      {
        message: "Payment successful",
        payment: {
          requestId: result.requestId,
          amount: result.amount,
          amountInRupees: result.amount / 100,
          status: "Success",
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("CONFIRM_PAYMENT_ERROR:", error);

    if (error instanceof Error) {
      if (error.message === "PAYMENT_REQUEST_NOT_FOUND") {
        return NextResponse.json(
          {
            message: "Payment request not found",
          },
          {
            status: 404,
          }
        );
      }

      if (error.message === "PAYMENT_REQUEST_NOT_PENDING") {
        return NextResponse.json(
          {
            message: "This payment request is no longer pending",
          },
          {
            status: 400,
          }
        );
      }

      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            message: "Insufficient balance",
          },
          {
            status: 400,
          }
        );
      }

      if (error.message === "PAYMENT_ALREADY_PROCESSED") {
        return NextResponse.json(
          {
            message: "Payment has already been processed",
          },
          {
            status: 400,
          }
        );
      }
    }

    return NextResponse.json(
      {
        message: "Unable to process payment",
      },
      {
        status: 500,
      }
    );
  }
}