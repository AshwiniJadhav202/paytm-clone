"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";

export async function createOnRampTransaction(
    provider: string,
    amount: number
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return {
                message: "Unauthenticated request",
            };
        }

        const userId = Number(session.user.id);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return {
                message: "Invalid user",
            };
        }

        if (!provider?.trim()) {
            return {
                message: "Please select a bank",
            };
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            return {
                message: "Please enter a valid amount",
            };
        }

        /*
         * Find the user's linked bank account.
         *
         * The current database does not have the old `Bank` model.
         * We use `BankAccount` instead.
         */
        const bankAccount = await prisma.bankAccount.findFirst({
            where: {
                userId,
                bankName: provider,
                status: "ACTIVE",
            },
        });

        if (!bankAccount) {
            return {
                message:
                    "This bank account is not linked to your Paytm account",
            };
        }

        /*
         * Create a unique provider payment ID.
         */
        const providerPaymentId = `demo_${Date.now()}_${Math.floor(
            Math.random() * 100000
        )}`;

        /*
         * PaymentAttempt is the current schema equivalent
         * of the old OnRampTransaction model.
         */
        await prisma.paymentAttempt.create({
            data: {
                userId,
                bankAccountId: bankAccount.id,
                amount,
                currency: "INR",
                provider: "Razorpay",
                providerPaymentId: providerPaymentId,
                status: "PENDING",
                updatedAt: new Date(),
            },
        });

        return {
            message: "Done",
            providerPaymentId,
        };
    } catch (error) {
        console.error("Create OnRamp Transaction Error:", error);

        return {
            message: "Something went wrong while creating the transaction",
        };
    }
}
