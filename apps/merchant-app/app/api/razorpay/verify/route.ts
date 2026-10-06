import { NextResponse } from "next/server";
import crypto from "crypto";

import prisma from "@repo/db/client";
import razorpay from "../../../../lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing payment verification details",
        },
        {
          status: 400,
        }
      );
    }

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error(
        "Razorpay secret key is missing"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Razorpay secret key is missing",
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // 1. Verify Razorpay signature
    // --------------------------------------------------

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          keySecret
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    const isSignatureValid =
      generatedSignature ===
      razorpay_signature;

    if (!isSignatureValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment signature",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // 2. Fetch actual Razorpay order
    // --------------------------------------------------

    const razorpayOrder =
      await razorpay.orders.fetch(
        razorpay_order_id
      );

    const amountInPaise =
      Number(razorpayOrder.amount);

    const currency = String(
      razorpayOrder.currency || "INR"
    );

    if (
      !Number.isFinite(
        amountInPaise
      ) ||
      amountInPaise <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment amount",
        },
        {
          status: 400,
        }
      );
    }

    if (currency !== "INR") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unsupported payment currency",
        },
        {
          status: 400,
        }
      );
    }

    const amountInRupees =
      Math.round(
        amountInPaise / 100
      );

    // --------------------------------------------------
    // 3. Find existing payment request
    // --------------------------------------------------

    const existingPayment =
      await prisma.payment.findUnique({
        where: {
          razorpayOrderId:
            razorpay_order_id,
        },
      });

    // --------------------------------------------------
    // 4. Make sure the payment request amount
    //    matches the Razorpay order amount
    // --------------------------------------------------

    if (
      existingPayment &&
      existingPayment.amount !==
        amountInRupees
    ) {
      console.error(
        "Payment amount mismatch",
        {
          databaseAmount:
            existingPayment.amount,
          razorpayAmount:
            amountInRupees,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Payment amount mismatch",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // 5. Process payment atomically
    // --------------------------------------------------

    const result =
      await prisma.$transaction(
        async (tx) => {
          const currentPayment =
            await tx.payment.findUnique({
              where: {
                razorpayOrderId:
                  razorpay_order_id,
              },
            });

          // --------------------------------------------
          // Payment already processed
          // --------------------------------------------

          if (
            currentPayment?.status ===
            "SUCCESS"
          ) {
            return {
              payment:
                currentPayment,
              balanceUpdated: false,
            };
          }

          // --------------------------------------------
          // Update existing payment
          // --------------------------------------------

          let payment;

          if (currentPayment) {
            payment =
              await tx.payment.update({
                where: {
                  id: currentPayment.id,
                },

                data: {
                  razorpayPaymentId:
                    razorpay_payment_id,

                  amount:
                    amountInRupees,

                  currency,

                  status: "SUCCESS",

                  method: "RAZORPAY",

                  updatedAt:
                    new Date(),
                },
              });
          } else {
            // ------------------------------------------
            // This supports normal Razorpay payments
            // which were not created as payment requests.
            // ------------------------------------------

            payment =
              await tx.payment.create({
                data: {
                  razorpayOrderId:
                    razorpay_order_id,

                  razorpayPaymentId:
                    razorpay_payment_id,

                  amount:
                    amountInRupees,

                  currency,

                  status: "SUCCESS",

                  method: "RAZORPAY",

                  updatedAt:
                    new Date(),
                },
              });
          }

          // --------------------------------------------
          // Update merchant balance
          // --------------------------------------------

          let balanceUpdated = false;

          if (payment.merchantId) {
            await tx.merchant.update({
              where: {
                id: payment.merchantId,
              },

              data: {
                balance: {
                  increment:
                    amountInRupees,
                },
              },
            });

            balanceUpdated = true;
          }

          return {
            payment,
            balanceUpdated,
          };
        }
      );

    console.log(
      "Payment processed successfully:",
      {
        paymentId:
          result.payment.id,

        razorpayOrderId:
          result.payment.razorpayOrderId,

        razorpayPaymentId:
          result.payment
            .razorpayPaymentId,

        amount:
          result.payment.amount,

        merchantId:
          result.payment.merchantId,

        balanceUpdated:
          result.balanceUpdated,
      }
    );

    return NextResponse.json(
      {
        success: true,

        message:
          result.balanceUpdated
            ? "Payment verified and merchant balance updated successfully"
            : "Payment already verified successfully",

        payment: {
          id:
            result.payment.id,

          orderId:
            result.payment
              .razorpayOrderId,

          paymentId:
            result.payment
              .razorpayPaymentId,

          amount:
            result.payment.amount,

          amountInRupees:
            result.payment.amount,

          currency:
            result.payment.currency,

          status:
            result.payment.status,

          method:
            result.payment.method,

          merchantId:
            result.payment.merchantId,

          createdAt:
            result.payment.createdAt,

          updatedAt:
            result.payment.updatedAt,
        },

        balanceUpdated:
          result.balanceUpdated,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Payment Verification Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Payment verification failed",
      },
      {
        status: 500,
      }
    );
  }
}