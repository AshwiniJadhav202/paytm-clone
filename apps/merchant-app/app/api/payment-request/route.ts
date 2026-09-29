
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";

import prisma from "@repo/db/client";
import { authOptions } from "../../../lib/auth";

// ==========================================
// POST: Create Merchant Payment Request
// ==========================================

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          message: "Unauthorized request",
        },
        {
          status: 401,
        }
      );
    }

    const body = await req.json();

    const { amount, description } = body;

    // Validate amount
    if (
      amount === undefined ||
      amount === null ||
      typeof amount === "boolean" ||
      (typeof amount === "string" && amount.trim() === "") ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return NextResponse.json(
        {
          message: "Valid amount is required",
        },
        {
          status: 400,
        }
      );
    }

    const amountInRupees = Number(amount);

    // Allow maximum ₹1,00,000
    if (amountInRupees > 100000) {
      return NextResponse.json(
        {
          message: "Maximum payment request amount is ₹1,00,000",
        },
        {
          status: 400,
        }
      );
    }

    const amountInPaise = Math.round(amountInRupees * 100);

    // Find merchant using logged-in email
    const merchant = await prisma.merchant.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          message: "Merchant account not found",
        },
        {
          status: 404,
        }
      );
    }

    // Create unique payment request token
    const token = crypto.randomUUID();

    const paymentRequest = await prisma.merchantPaymentRequest.create({
      data: {
        merchantId: merchant.id,
        amount: amountInPaise,
        description:
          typeof description === "string" &&
          description.trim().length > 0
            ? description.trim()
            : null,
        token,
        status: "Pending",
      },
    });

    return NextResponse.json(
      {
        message: "Payment request created successfully",
        paymentRequest: {
          id: paymentRequest.id,
          amount: paymentRequest.amount,
          amountInRupees: paymentRequest.amount / 100,
          description: paymentRequest.description,
          token: paymentRequest.token,
          status: paymentRequest.status,
          createdAt: paymentRequest.createdAt,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("MERCHANT_PAYMENT_REQUEST_ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to create payment request",
      },
      {
        status: 500,
      }
    );
  }
}

// ==========================================
// GET: Fetch Merchant Payment Request History
// ==========================================

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          message: "Unauthorized request",
        },
        {
          status: 401,
        }
      );
    }

    // Find merchant using logged-in email
    const merchant = await prisma.merchant.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          message: "Merchant account not found",
        },
        {
          status: 404,
        }
      );
    }

    // Fetch only this merchant's payment requests
    const paymentRequests =
      await prisma.merchantPaymentRequest.findMany({
        where: {
          merchantId: merchant.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          amount: true,
          description: true,
          token: true,
          status: true,
          createdAt: true,
        },
      });

    // Convert amount from paise to rupees for frontend
    const formattedPaymentRequests = paymentRequests.map(
      (request) => ({
        id: request.id,
        amount: request.amount,
        amountInRupees: request.amount / 100,
        description: request.description,
        token: request.token,
        status: request.status,
        createdAt: request.createdAt,
      })
    );

    return NextResponse.json({
      paymentRequests: formattedPaymentRequests,
    });
  } catch (error) {
    console.error("MERCHANT_PAYMENT_HISTORY_ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to fetch payment request history",
      },
      {
        status: 500,
      }
    );
  }
}