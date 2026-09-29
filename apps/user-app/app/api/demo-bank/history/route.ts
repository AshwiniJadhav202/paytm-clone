import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@repo/db/client";
import { authOptions } from "../../../lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);

    const transactions = await prisma.demoBankTransfer.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        bankAccountId: true,
        amount: true,
        status: true,
        token: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      transactions,
    });
  } catch (error) {
    console.error("DEMO_BANK_HISTORY_ERROR:", error);

    return NextResponse.json(
      { message: "Unable to fetch transaction history" },
      { status: 500 }
    );
  }
}