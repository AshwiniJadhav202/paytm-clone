
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import razorpay from "../../../../lib/razorpay";

// Prevent creating multiple Prisma connections during development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    console.log("Payment Verification Request:", {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    // 1. Validate payment details
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing payment verification details",
        },
        { status: 400 }
      );
    }

    // 2. Get Razorpay secret key
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error("Razorpay secret key is missing");

      return NextResponse.json(
        {
          success: false,
          message: "Razorpay secret key is missing",
        },
        { status: 500 }
      );
    }

    // 3. Generate expected signature
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    // 4. Compare signatures
    // Fixed TypeScript Buffer/timingSafeEqual error
    const isSignatureValid =
      generatedSignature === razorpay_signature;

    console.log("Signature Verification Result:", {
      isSignatureValid,
      generatedSignatureLength: generatedSignature.length,
      receivedSignatureLength: razorpay_signature.length,
    });

    // 5. Reject invalid signature
    if (!isSignatureValid) {
      console.error("Invalid Razorpay Signature");

      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment signature",
        },
        { status: 400 }
      );
    }

    console.log("Payment signature verified successfully");

    // 6. Fetch actual order details from Razorpay
    const razorpayOrder = await razorpay.orders.fetch(
      razorpay_order_id
    );

    const amountInPaise = Number(razorpayOrder.amount);

    const currency = String(
      razorpayOrder.currency || "INR"
    );

    console.log("Razorpay Order Details:", {
      orderId: razorpayOrder.id,
      amountInPaise,
      currency,
    });

    // 7. Validate order amount
    if (
      !Number.isFinite(amountInPaise) ||
      amountInPaise <= 0
    ) {
      console.error("Invalid Razorpay order amount");

      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment amount",
        },
        { status: 400 }
      );
    }

    // 8. Save payment in database
    const payment = await prisma.razorpayPayment.upsert({
      where: {
        orderId: razorpay_order_id,
      },

      update: {
        paymentId: razorpay_payment_id,
        amount: amountInPaise,
        currency,
        status: "SUCCESS",
      },

      create: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: amountInPaise,
        currency,
        status: "SUCCESS",
      },
    });

    console.log("Payment saved in database:", {
      id: payment.id,
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    });

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Payment verified and saved successfully",

        payment: {
          id: payment.id,
          orderId: payment.orderId,
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Payment Verification Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Payment verification failed",
      },
      { status: 500 }
    );
  }
}