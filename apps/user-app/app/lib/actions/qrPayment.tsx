"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";
import bcrypt from "bcrypt";

export async function qrPayment(
    receiverId: number,
    amount: number,
    balancePin: string
) {
    const session = await getServerSession(authOptions);

    const senderId = session?.user?.id;

    if (!senderId) {
        return {
            success: false,
            message: "Please login first",
        };
    }

    const fromUserId = Number(senderId);

    // Validate sender ID
    if (!Number.isSafeInteger(fromUserId) || fromUserId <= 0) {
        return {
            success: false,
            message: "Invalid logged-in user",
        };
    }

    // Validate receiver ID
    if (!Number.isInteger(receiverId) || receiverId <= 0) {
        return {
            success: false,
            message: "Invalid receiver",
        };
    }

    // Validate amount
    if (!Number.isInteger(amount) || amount <= 0) {
        return {
            success: false,
            message: "Please enter a valid amount",
        };
    }

    // Validate PIN
    if (
        typeof balancePin !== "string" ||
        !/^\d{4,6}$/.test(balancePin)
    ) {
        return {
            success: false,
            message: "PIN must contain 4 to 6 digits",
        };
    }

    if (receiverId === fromUserId) {
        return {
            success: false,
            message: "You cannot send money to yourself",
        };
    }

    try {
        // Find sender
        const sender = await prisma.user.findUnique({
            where: {
                id: fromUserId,
            },
            select: {
                id: true,
                balance: true,
                balancePin: true,
            },
        });

        if (!sender) {
            return {
                success: false,
                message: "Sender not found",
            };
        }

        // Find receiver
        const receiver = await prisma.user.findUnique({
            where: {
                id: receiverId,
            },
            select: {
                id: true,
            },
        });

        if (!receiver) {
            return {
                success: false,
                message: "Receiver not found",
            };
        }

        // Verify sender's Payment PIN
        if (!sender.balancePin) {
            return {
                success: false,
                message: "Please set your Payment PIN first",
            };
        }

        const isPinValid = await bcrypt.compare(
            balancePin,
            sender.balancePin
        );

        if (!isPinValid) {
            return {
                success: false,
                message: "Incorrect Payment PIN",
            };
        }

        /*
         * Perform the complete QR payment atomically.
         *
         * Current database architecture:
         *
         * User.balance  -> wallet balance
         * Transaction   -> P2P transaction history
         */
        await prisma.$transaction(async (tx) => {
            /*
             * Deduct money from sender only when enough balance exists.
             *
             * This replaces the old Balance model logic:
             *
             * OLD:
             * tx.balance.update(...)
             *
             * CURRENT:
             * tx.user.update(...)
             */
            const senderBalanceUpdate =
                await tx.user.updateMany({
                    where: {
                        id: fromUserId,
                        balance: {
                            gte: amount,
                        },
                    },
                    data: {
                        balance: {
                            decrement: amount,
                        },
                    },
                });

            if (senderBalanceUpdate.count !== 1) {
                throw new Error("Insufficient balance");
            }

            // Add money to receiver
            await tx.user.update({
                where: {
                    id: receiverId,
                },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            });

            /*
             * Create transaction history.
             *
             * Current schema uses Transaction:
             *
             * senderId
             * receiverId
             * amount
             * createdAt
             */
            await tx.transaction.create({
                data: {
                    senderId: fromUserId,
                    receiverId: receiverId,
                    amount: amount,
                },
            });
        });

        return {
            success: true,
            message: "QR payment successful!",
        };
    } catch (error) {
        console.error("QR Payment Error:", error);

        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Something went wrong while processing payment",
        };
    }
}
