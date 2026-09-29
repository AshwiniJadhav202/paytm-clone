"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";

export async function p2pTransfer(
  to: string,
  amount: number
) {
  const session = await getServerSession(authOptions);

  const from = session?.user?.id;

  if (!from) {
    return {
      message: "Please login first",
    };
  }

  const fromUserId = Number(from);

  if (!Number.isSafeInteger(fromUserId) || fromUserId <= 0) {
    return {
      message: "Invalid logged-in user",
    };
  }

  // Validate receiver number
  const receiverNumber = to?.trim();

  if (!receiverNumber) {
    return {
      message: "Please enter receiver number",
    };
  }

  // Validate amount
  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return {
      message: "Please enter a valid amount",
    };
  }

  // Find receiver
  const toUser = await prisma.user.findFirst({
    where: {
      number: receiverNumber,
    },
  });

  if (!toUser) {
    return {
      message: "Receiver not found",
    };
  }

  // Prevent sending money to yourself
  if (toUser.id === fromUserId) {
    return {
      message: "You cannot send money to yourself",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      /*
       * Make sure sender has a Balance row.
       *
       * This also fixes old users who were created
       * before Balance creation was added to signup.
       */
      const fromBalance = await tx.balance.upsert({
        where: {
          userId: fromUserId,
        },
        create: {
          userId: fromUserId,
          amount: 0,
          locked: 0,
        },
        update: {},
      });

      /*
       * Make sure receiver has a Balance row.
       */
      await tx.balance.upsert({
        where: {
          userId: toUser.id,
        },
        create: {
          userId: toUser.id,
          amount: 0,
          locked: 0,
        },
        update: {},
      });

      // Check sender balance
      if (fromBalance.amount < amount) {
        throw new Error(
          `Insufficient balance. Your current balance is ${fromBalance.amount}`
        );
      }

      // Deduct money from sender
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

      // Add money to receiver
      await tx.balance.update({
        where: {
          userId: toUser.id,
        },
        data: {
          amount: {
            increment: amount,
          },
        },
      });

      // Create P2P transfer record
      await tx.p2pTransfer.create({
        data: {
          fromUserId: fromUserId,
          toUserId: toUser.id,
          amount: amount,
          timestamp: new Date(),
        },
      });
    });

    return {
      message: "Money sent successfully!",
    };
  } catch (error) {
    console.error(
      "P2P Transfer Error:",
      error
    );

    return {
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while sending money",
    };
  }
}