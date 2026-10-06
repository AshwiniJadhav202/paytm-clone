import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";

import prisma from "@repo/db/client";
import { authOptions } from "../../../../lib/auth";

type RouteContext = {
    params: {
        token: string;
    };
};

export async function POST(
    request: Request,
    context: RouteContext
) {
    try {
        // ==========================================
        // 1. Verify logged-in user
        // ==========================================

        const session =
            await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                {
                    message:
                        "Please login to make payment",
                },
                {
                    status: 401,
                }
            );
        }

        const userEmail =
            session.user.email.toLowerCase();

        // ==========================================
        // 2. Read Payment PIN
        // ==========================================

        const body = await request.json();
        const pin = String(body.pin || "");

        if (!/^\d{4,6}$/.test(pin)) {
            return NextResponse.json(
                {
                    message:
                        "Valid 4-6 digit Payment PIN is required",
                },
                {
                    status: 400,
                }
            );
        }

        // ==========================================
        // 3. Get payment token
        // ==========================================

        const token = context.params.token;

        if (!token) {
            return NextResponse.json(
                {
                    message:
                        "Payment token is required",
                },
                {
                    status: 400,
                }
            );
        }

        // ==========================================
        // 4. Find the logged-in user
        // ==========================================

        const user = await prisma.user.findUnique({
            where: {
                email: userEmail,
            },
            select: {
                id: true,
                balance: true,
                balancePin: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    message:
                        "User account not found",
                },
                {
                    status: 404,
                }
            );
        }

        const userId = user.id;

        // ==========================================
        // 5. Check Payment PIN
        // ==========================================

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

        const isPinValid =
            await bcrypt.compare(
                pin,
                user.balancePin
            );

        if (!isPinValid) {
            return NextResponse.json(
                {
                    message:
                        "Incorrect Payment PIN",
                },
                {
                    status: 401,
                }
            );
        }

        // ==========================================
        // 6. Process payment
        // ==========================================

        const result = await prisma.$transaction(
            async (tx) => {
                // --------------------------------------
                // Find pending payment using token
                //
                // In the current schema the token is
                // represented by razorpayOrderId.
                // --------------------------------------

                const payment =
                    await tx.payment.findUnique({
                        where: {
                            razorpayOrderId: token,
                        },
                        select: {
                            id: true,
                            userId: true,
                            merchantId: true,
                            amount: true,
                            currency: true,
                            status: true,
                            razorpayOrderId: true,
                        },
                    });

                if (!payment) {
                    throw new Error(
                        "PAYMENT_NOT_FOUND"
                    );
                }

                // --------------------------------------
                // Payment must still be pending
                // --------------------------------------

                if (
                    payment.status !==
                    "PENDING"
                ) {
                    throw new Error(
                        "PAYMENT_NOT_PENDING"
                    );
                }

                // --------------------------------------
                // Payment amount
                //
                // Current project stores wallet amounts
                // in User.balance using rupees.
                // --------------------------------------

                const amount =
                    payment.amount;

                if (
                    !Number.isInteger(amount) ||
                    amount <= 0
                ) {
                    throw new Error(
                        "INVALID_PAYMENT_AMOUNT"
                    );
                }

                // --------------------------------------
                // Make sure user has enough balance
                // --------------------------------------

                const balanceUpdate =
                    await tx.user.updateMany({
                        where: {
                            id: userId,
                            balance: {
                                gte: amount,
                            },
                        },
                        data: {
                            balance: {
                                decrement:
                                    amount,
                            },
                        },
                    });

                if (
                    balanceUpdate.count !== 1
                ) {
                    throw new Error(
                        "INSUFFICIENT_BALANCE"
                    );
                }

                // --------------------------------------
                // Update merchant balance
                // --------------------------------------

                if (!payment.merchantId) {
                    throw new Error(
                        "MERCHANT_NOT_FOUND"
                    );
                }

                const merchant =
                    await tx.merchant.findUnique({
                        where: {
                            id: payment.merchantId,
                        },
                        select: {
                            id: true,
                            balance: true,
                        },
                    });

                if (!merchant) {
                    throw new Error(
                        "MERCHANT_NOT_FOUND"
                    );
                }

                await tx.merchant.update({
                    where: {
                        id: merchant.id,
                    },
                    data: {
                        balance: {
                            increment:
                                amount,
                        },
                    },
                });

                // --------------------------------------
                // Mark payment as successful
                // --------------------------------------

                const updatedPayment =
                    await tx.payment.updateMany({
                        where: {
                            id: payment.id,
                            status: "PENDING",
                        },
                        data: {
                            status: "SUCCESS",
                            userId: userId,
                            updatedAt:
                                new Date(),
                        },
                    });

                if (
                    updatedPayment.count !== 1
                ) {
                    throw new Error(
                        "PAYMENT_ALREADY_PROCESSED"
                    );
                }

                return {
                    paymentId:
                        payment.id,
                    amount,
                    merchantId:
                        payment.merchantId,
                };
            }
        );

        // ==========================================
        // 7. Return successful response
        // ==========================================

        return NextResponse.json(
            {
                message:
                    "Payment successful",

                payment: {
                    requestId:
                        result.paymentId,

                    amount:
                        result.amount,

                    amountInRupees:
                        result.amount,

                    status: "Success",
                },
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "CONFIRM_PAYMENT_ERROR:",
            error
        );

        // ==========================================
        // Handle known errors
        // ==========================================

        if (error instanceof Error) {
            if (
                error.message ===
                "PAYMENT_NOT_FOUND"
            ) {
                return NextResponse.json(
                    {
                        message:
                            "Payment request not found",
                    },
                    {
                        status: 404,
                    }
                );
            }

            if (
                error.message ===
                "PAYMENT_NOT_PENDING"
            ) {
                return NextResponse.json(
                    {
                        message:
                            "This payment request is no longer pending",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (
                error.message ===
                "INSUFFICIENT_BALANCE"
            ) {
                return NextResponse.json(
                    {
                        message:
                            "Insufficient balance",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (
                error.message ===
                "PAYMENT_ALREADY_PROCESSED"
            ) {
                return NextResponse.json(
                    {
                        message:
                            "Payment has already been processed",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (
                error.message ===
                "MERCHANT_NOT_FOUND"
            ) {
                return NextResponse.json(
                    {
                        message:
                            "Merchant account not found",
                    },
                    {
                        status: 404,
                    }
                );
            }

            if (
                error.message ===
                "INVALID_PAYMENT_AMOUNT"
            ) {
                return NextResponse.json(
                    {
                        message:
                            "Invalid payment amount",
                    },
                    {
                        status: 400,
                    }
                );
            }
        }

        // ==========================================
        // Unknown error
        // ==========================================

        return NextResponse.json(
            {
                message:
                    "Unable to process payment",
            },
            {
                status: 500,
            }
        );
    }
}
