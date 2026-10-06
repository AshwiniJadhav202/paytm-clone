"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";
import bcrypt from "bcrypt";

export async function p2pTransfer(
  to: string,
  amount: number,
  pin: string
) {
  try {
    // 1. Check logged-in user
    const session = await getServerSession(authOptions);

    const from = session?.user?.id;

    if (!from) {
      return {
        message: "Please login first",
      };
    }

    const fromUserId = Number(from);

    if (
      !Number.isSafeInteger(fromUserId) ||
      fromUserId <= 0
    ) {
      return {
        message: "Invalid logged-in user",
      };
    }

    // 2. Validate receiver number
    const receiverNumber = to?.trim();

    if (!receiverNumber) {
      return {
        message: "Please enter receiver mobile number",
      };
    }

    // 3. Validate amount
    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return {
        message: "Please enter a valid amount",
      };
    }

    // 4. Validate PIN
    if (
      typeof pin !== "string" ||
      !/^\d{4,6}$/.test(pin)
    ) {
      return {
        message: "Payment PIN must contain 4 to 6 digits",
      };
    }

    // 5. Find receiver
    const receiver = await prisma.user.findUnique({
      where: {
        number: receiverNumber,
      },
    });

    if (!receiver) {
      return {
        message: "Receiver not found",
      };
    }

    // 6. Prevent self transfer
    if (receiver.id === fromUserId) {
      return {
        message: "You cannot send money to yourself",
      };
    }

    // 7. Get sender
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
        message: "Sender account not found",
      };
    }

    // 8. Make sure PIN exists
    if (!sender.balancePin) {
      return {
        message:
          "Payment PIN is not set. Please set your PIN first.",
      };
    }

    // 9. Verify Payment PIN
    const isPinValid = await bcrypt.compare(
      pin,
      sender.balancePin
    );

    if (!isPinValid) {
      return {
        message: "Incorrect Payment PIN",
      };
    }

    // 10. Check balance
    if (sender.balance < amount) {
      return {
        message: `Insufficient balance. Available balance: ₹${sender.balance}`,
      };
    }

    // 11. Perform complete transfer atomically
    await prisma.$transaction(async (tx) => {
      // Deduct from sender
      await tx.user.update({
        where: {
          id: fromUserId,
        },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Add to receiver
      await tx.user.update({
        where: {
          id: receiver.id,
        },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          senderId: fromUserId,
          receiverId: receiver.id,
          amount,
        },
      });
    });

    return {
      message: "Money sent successfully!",
    };
  } catch (error) {
    console.error("P2P Transfer Error:", error);

    return {
      message:
        "Something went wrong while processing the transfer",
    };
  }
}