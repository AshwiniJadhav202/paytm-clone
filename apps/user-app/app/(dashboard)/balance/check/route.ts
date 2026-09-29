import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";

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

    const userId = Number(session.user.id);

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        balancePin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // New user: Balance PIN is not set
    if (!user.balancePin) {
      return NextResponse.json({
        needsPinSetup: true,
      });
    }

   const body = await request.json();
const pin = String(body.pin || "");

// Existing user: PIN is required only when checking balance
if (!pin) {
  return NextResponse.json({
    needsPinSetup: false,
  });
}

if (!/^\d{6}$/.test(pin)) {
  return NextResponse.json(
    { message: "Please enter a valid 6-digit PIN" },
    { status: 400 }
  );
}

    const isPinValid = await bcrypt.compare(
      pin,
      user.balancePin
    );

    if (!isPinValid) {
      return NextResponse.json(
        { message: "Incorrect PIN" },
        { status: 401 }
      );
    }

    const balance = await prisma.balance.findFirst({
      where: {
        userId: userId,
      },
      select: {
        amount: true,
      },
    });

    return NextResponse.json({
      needsPinSetup: false,
      balance: balance?.amount || 0,
    });
  } catch (error) {
    console.error("CHECK_BALANCE_ERROR:", error);

    return NextResponse.json(
      { message: "Unable to check balance" },
      { status: 500 }
    );
  }
}