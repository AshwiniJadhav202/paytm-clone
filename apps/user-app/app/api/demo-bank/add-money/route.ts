import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import crypto from "crypto";

import prisma from "@repo/db/client";
import { authOptions } from "../../../lib/auth";

export async function POST(request: Request) {
    try {
        // 1. Check logged-in user
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                {
                    message: "Unauthorized request",
                },
                {
                    status: 401,
                }
            );
        }

        // 2. Read request body
        const body = await request.json();

        const bankAccountId = Number(body.bankAccountId);
        const amountRupees = Number(body.amount);
        const pin = String(body.pin || "");

        // 3. Validate bank account ID
        if (
            !Number.isInteger(bankAccountId) ||
            bankAccountId <= 0
        ) {
            return NextResponse.json(
                {
                    message: "Invalid bank account",
                },
                {
                    status: 400,
                }
            );
        }

        // 4. Validate amount
        if (
            !Number.isInteger(amountRupees) ||
            amountRupees <= 0 ||
            amountRupees > 100000
        ) {
            return NextResponse.json(
                {
                    message:
                        "Amount must be between ₹1 and ₹100000",
                },
                {
                    status: 400,
                }
            );
        }

        // 5. Validate 6-digit PIN
        if (!/^\d{6}$/.test(pin)) {
            return NextResponse.json(
                {
                    message:
                        "Please enter a valid 6-digit PIN",
                },
                {
                    status: 400,
                }
            );
        }

        // 6. Convert session user ID to number
        const userId = Number(session.user.id);

        if (
            !Number.isSafeInteger(userId) ||
            userId <= 0
        ) {
            return NextResponse.json(
                {
                    message: "Invalid user",
                },
                {
                    status: 400,
                }
            );
        }

        // 7. Perform the complete operation inside
        //    a single database transaction
        const result = await prisma.$transaction(
            async (tx) => {
                // -----------------------------------------
                // Find logged-in user
                // -----------------------------------------
                const user = await tx.user.findUnique({
                    where: {
                        id: userId,
                    },
                    select: {
                        id: true,
                        balance: true,
                        balancePin: true,
                    },
                });

                if (!user) {
                    throw new Error(
                        "User account not found"
                    );
                }

                // -----------------------------------------
                // Check whether Payment PIN exists
                // -----------------------------------------
                if (!user.balancePin) {
                    throw new Error(
                        "Please set your balance PIN first"
                    );
                }

                // -----------------------------------------
                // Verify Payment PIN
                // -----------------------------------------
                const isPinValid = await bcrypt.compare(
                    pin,
                    user.balancePin
                );

                if (!isPinValid) {
                    throw new Error("Incorrect PIN");
                }

                // -----------------------------------------
                // Find linked bank account
                // -----------------------------------------
                const bankAccount =
                    await tx.bankAccount.findFirst({
                        where: {
                            id: bankAccountId,
                            userId: userId,
                            status: "ACTIVE",
                        },
                        select: {
                            id: true,
                            bankName: true,
                            maskedAccount: true,
                            provider: true,
                        },
                    });

                if (!bankAccount) {
                    throw new Error(
                        "Bank account not found or inactive"
                    );
                }

                // -----------------------------------------
                // Add money to wallet
                //
                // IMPORTANT:
                // User.balance is the actual wallet balance
                // in the current database schema.
                // -----------------------------------------
                const updatedUser =
                    await tx.user.update({
                        where: {
                            id: userId,
                        },
                        data: {
                            balance: {
                                increment: amountRupees,
                            },
                        },
                        select: {
                            balance: true,
                        },
                    });

                // -----------------------------------------
                // Create payment attempt/history record
                // -----------------------------------------
                const providerPaymentId =
                    `demo_add_money_${crypto.randomUUID()}`;

                await tx.paymentAttempt.create({
                    data: {
                        userId: userId,
                        bankAccountId: bankAccount.id,
                        amount: amountRupees,
                        currency: "INR",
                        provider: "DEMO_BANK",
                        providerPaymentId:
                            providerPaymentId,
                        status: "SUCCESS",
                        updatedAt: new Date(),
                    },
                });

                // -----------------------------------------
                // Return successful result
                // -----------------------------------------
                return {
                    message:
                        "Money added to wallet successfully",
                    amount: amountRupees,
                    balance: updatedUser.balance,
                    providerPaymentId:
                        providerPaymentId,
                    bank: bankAccount.bankName,
                    account:
                        bankAccount.maskedAccount,
                };
            }
        );

        // 8. Send successful response
        return NextResponse.json(result);
    } catch (error) {
        console.error(
            "ADD_MONEY_ERROR:",
            error
        );

        const message =
            error instanceof Error
                ? error.message
                : "Unable to add money";

        return NextResponse.json(
            {
                message,
            },
            {
                status: 400,
            }
        );
    }
}
