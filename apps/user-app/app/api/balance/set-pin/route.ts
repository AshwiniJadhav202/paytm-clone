
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

    const body = await request.json();
    const pin = String(body.pin || "");
    const confirmPin = String(body.confirmPin || "");

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { message: "PIN must contain exactly 6 digits" },
        { status: 400 }
      );
    }

    if (pin !== confirmPin) {
      return NextResponse.json(
        { message: "PINs do not match" },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);

    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        balancePin: hashedPin,
      },
    });

    return NextResponse.json({
      message: "Balance PIN set successfully",
    });
  } catch (error) {
    console.error("SET_BALANCE_PIN_ERROR:", error);

    return NextResponse.json(
      { message: "Unable to set balance PIN" },
      { status: 500 }
    );
  }
}