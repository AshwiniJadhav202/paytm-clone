import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    console.log("User App Payment Verification Request:", {
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

    // 4. Compare signatures securely
    const generatedSignatureBuffer = Buffer.from(
      generatedSignature,
      "utf8"
    );

    const receivedSignatureBuffer = Buffer.from(
      razorpay_signature,
      "utf8"
    );

    const isSignatureValid =
  generatedSignature === razorpay_signature;

    console.log("User App Signature Verification Result:", {
      isSignatureValid,
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

    console.log("User App Payment Verified Successfully");

    // 6. Return verification success
    // Database saving is handled by merchant-app
    return NextResponse.json(
      {
        success: true,
        message: "Payment verified successfully",

        payment: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          status: "SUCCESS",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "User App Payment Verification Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Payment verification failed",
      },
      { status: 500 }
    );
  }
}