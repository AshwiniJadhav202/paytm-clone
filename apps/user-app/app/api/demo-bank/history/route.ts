import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@repo/db/client";
import { authOptions } from "../../../lib/auth";

export async function GET() {
    try {
        // -----------------------------------------
        // 1. Check logged-in user
        // -----------------------------------------
        const session =
            await getServerSession(authOptions);

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

        // -----------------------------------------
        // 2. Convert user ID
        // -----------------------------------------
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

        // -----------------------------------------
        // 3. Get Add Money / Bank transactions
        //
        // Current schema:
        // PaymentAttempt = Add Money transaction
        // -----------------------------------------
        const transactions =
            await prisma.paymentAttempt.findMany({
                where: {
                    userId,
                },
                include: {
                    BankAccount: {
                        select: {
                            bankName: true,
                            maskedAccount: true,
                            provider: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

        // -----------------------------------------
        // 4. Convert database records into a
        //    simple response for the frontend
        // -----------------------------------------
        const history = transactions.map(
            (transaction) => ({
                id: transaction.id,
                amount: transaction.amount,
                currency: transaction.currency,
                provider: transaction.provider,
                providerPaymentId:
                    transaction.providerPaymentId,
                status: transaction.status,
                createdAt:
                    transaction.createdAt,
                updatedAt:
                    transaction.updatedAt,

                bankAccount:
                    transaction.BankAccount
                        ? {
                              bankName:
                                  transaction
                                      .BankAccount
                                      .bankName,
                              maskedAccount:
                                  transaction
                                      .BankAccount
                                      .maskedAccount,
                              provider:
                                  transaction
                                      .BankAccount
                                      .provider,
                          }
                        : null,
            })
        );

        // -----------------------------------------
        // 5. Return history
        // -----------------------------------------
        return NextResponse.json({
            transactions: history,
        });
    } catch (error) {
        console.error(
            "DEMO_BANK_HISTORY_ERROR:",
            error
        );

        return NextResponse.json(
            {
                message:
                    "Unable to fetch transaction history",
            },
            {
                status: 500,
            }
        );
    }
}
