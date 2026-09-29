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
    if (!/^\d{4,6}$/.test(balancePin)) {
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
        });

        if (!receiver) {
            return {
                success: false,
                message: "Receiver not found",
            };
        }

        // Verify sender's balance PIN
        if (!sender.balancePin) {
            return {
                success: false,
                message: "Please set your balance PIN first",
            };
        }

        const isPinValid = await bcrypt.compare(
            balancePin,
            sender.balancePin
        );

        if (!isPinValid) {
            return {
                success: false,
                message: "Incorrect balance PIN",
            };
        }

        await prisma.$transaction(async (tx) => {
            // Lock sender balance
            await tx.$queryRaw`
                SELECT *
                FROM "Balance"
                WHERE "userId" = ${fromUserId}
                FOR UPDATE
            `;

            // Lock receiver balance
            await tx.$queryRaw`
                SELECT *
                FROM "Balance"
                WHERE "userId" = ${receiverId}
                FOR UPDATE
            `;

            // Find sender balance
            const senderBalance = await tx.balance.findUnique({
                where: {
                    userId: fromUserId,
                },
            });

            if (!senderBalance) {
                throw new Error("Sender balance not found");
            }

            // Check available balance
            if (senderBalance.amount < amount) {
                throw new Error("Insufficient balance");
            }

            // Find receiver balance
            const receiverBalance = await tx.balance.findUnique({
                where: {
                    userId: receiverId,
                },
            });

            if (!receiverBalance) {
                throw new Error("Receiver balance not found");
            }

            // Deduct sender balance
            await tx.balance.update({
                where: {
                    userId: fromUserId,
                },
                data: {
                    amount: {
                        decrement: amount,
                    },
                },
            });

            // Add receiver balance
            await tx.balance.update({
                where: {
                    userId: receiverId,
                },
                data: {
                    amount: {
                        increment: amount,
                    },
                },
            });

            // Create P2P transaction
            await tx.p2pTransfer.create({
                data: {
                    fromUserId: fromUserId,
                    toUserId: receiverId,
                    amount: amount,
                    timestamp: new Date(),
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