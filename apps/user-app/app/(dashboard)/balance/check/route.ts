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

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { message: "Invalid user session" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        balance: true,
        balancePin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Payment/Balance PIN has not been configured yet
    if (!user.balancePin) {
      return NextResponse.json({
        needsPinSetup: true,
      });
    }

    const body = await request.json();
    const pin = String(body?.pin || "").trim();

    // PIN is required to view wallet balance
    if (!pin) {
      return NextResponse.json({
        needsPinSetup: false,
        requiresPin: true,
      });
    }

    // Current application supports 4-6 digit Payment PIN
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { message: "Please enter a valid 4 to 6 digit PIN" },
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

    // Wallet balance is stored directly in User.balance
    return NextResponse.json({
      needsPinSetup: false,
      requiresPin: true,
      balance: user.balance,
    });
  } catch (error) {
    console.error("CHECK_BALANCE_ERROR:", error);

    return NextResponse.json(
      { message: "Unable to check balance" },
      { status: 500 }
    );
  }
}
