import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import crypto from "crypto";

import prisma from "@repo/db/client";
import { authOptions } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const bankAccountId = Number(body.bankAccountId);
    const amountRupees = Number(body.amount);
    const pin = String(body.pin || "");

    if (!Number.isInteger(bankAccountId) || bankAccountId <= 0) {
      return NextResponse.json(
        { message: "Invalid bank account" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(amountRupees) ||
      amountRupees <= 0 ||
      amountRupees > 100000
    ) {
      return NextResponse.json(
        { message: "Amount must be between ₹1 and ₹100000" },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { message: "Please enter a valid 6-digit PIN" },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);
    const amountPaise = amountRupees * 100;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          balancePin: true,
        },
      });

      if (!user?.balancePin) {
        throw new Error("Please set your balance PIN first");
      }

      const isPinValid = await bcrypt.compare(
        pin,
        user.balancePin
      );

      if (!isPinValid) {
        throw new Error("Incorrect PIN");
      }

      const bankAccount = await tx.demoBankAccount.findFirst({
        where: {
          id: bankAccountId,
          userId,
          isVerified: true,
        },
      });

      if (!bankAccount) {
        throw new Error("Bank account not found");
      }

      if (bankAccount.balance < amountPaise) {
        throw new Error("Insufficient bank balance");
      }

      const bankUpdate = await tx.demoBankAccount.updateMany({
        where: {
          id: bankAccountId,
          userId,
          balance: {
            gte: amountPaise,
          },
        },
        data: {
          balance: {
            decrement: amountPaise,
          },
        },
      });

      if (bankUpdate.count !== 1) {
        throw new Error("Unable to debit bank account");
      }

      await tx.balance.upsert({
        where: {
          userId,
        },
        update: {
          amount: {
            increment: amountPaise,
          },
        },
        create: {
          userId,
          amount: amountPaise,
          locked: 0,
        },
      });

      await tx.demoBankTransfer.create({
        data: {
          userId,
          bankAccountId,
          amount: amountPaise,
          status: "Success",
          token: crypto.randomUUID(),
        },
      });

      return {
        amount: amountRupees,
        message: "Money added to wallet successfully",
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("ADD_MONEY_ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to add money";

    return NextResponse.json(
      { message },
      { status: 400 }
    );
  }
}