
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function GET() {
  try {
    const payments = await prisma.razorpayPayment.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        payments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch Payments Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch payment history",
      },
      { status: 500 }
    );
  }
}