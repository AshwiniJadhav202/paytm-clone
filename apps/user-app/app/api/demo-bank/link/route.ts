import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@repo/db/client";
import { authOptions } from "../../../lib/auth";

export async function GET() {
    try {
        // -----------------------------------------
        // 1. Check authentication
        // -----------------------------------------
        const session =
            await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                {
                    message: "Unauthorized request",
                },
                {
                    status: 401,
                }
            );
        }

        const userId = Number(session.user.id);

        if (
            !Number.isSafeInteger(userId) ||
            userId <= 0
        ) {
            return NextResponse.json(
                {
                    message: "Invalid user",
                },
                {
                    status: 400,
                }
            );
        }

        // -----------------------------------------
        // 2. Get user's linked bank accounts
        // -----------------------------------------
        const accounts =
            await prisma.bankAccount.findMany({
                where: {
                    userId,
                },
                orderBy: [
                    {
                        isPrimary: "desc",
                    },
                    {
                        createdAt: "desc",
                    },
                ],
                select: {
                    id: true,
                    bankName: true,
                    maskedAccount: true,
                    ifsc: true,
                    provider: true,
                    providerRef: true,
                    status: true,
                    isPrimary: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

        // -----------------------------------------
        // 3. Return linked accounts
        // -----------------------------------------
        return NextResponse.json({
            accounts,
        });
    } catch (error) {
        console.error(
            "DEMO_BANK_LINK_GET_ERROR:",
            error
        );

        return NextResponse.json(
            {
                message:
                    "Unable to fetch linked bank accounts",
            },
            {
                status: 500,
            }
        );
    }
}

export async function POST(request: Request) {
    try {
        // -----------------------------------------
        // 1. Check authentication
        // -----------------------------------------
        const session =
            await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                {
                    message: "Unauthorized request",
                },
                {
                    status: 401,
                }
            );
        }

        const userId = Number(session.user.id);

        if (
            !Number.isSafeInteger(userId) ||
            userId <= 0
        ) {
            return NextResponse.json(
                {
                    message: "Invalid user",
                },
                {
                    status: 400,
                }
            );
        }

        // -----------------------------------------
        // 2. Read request body
        // -----------------------------------------
        const body = await request.json();

        const bankName = String(
            body.bankName || ""
        ).trim();

        const maskedAccount = String(
            body.maskedAccount || ""
        ).trim();

        const ifsc = String(
            body.ifsc || ""
        ).trim();

        const provider = String(
            body.provider || "DEMO_BANK"
        ).trim();

        const providerRef = String(
            body.providerRef || ""
        ).trim();

        // -----------------------------------------
        // 3. Validate bank details
        // -----------------------------------------
        if (!bankName) {
            return NextResponse.json(
                {
                    message:
                        "Bank name is required",
                },
                {
                    status: 400,
                }
            );
        }

        if (!maskedAccount) {
            return NextResponse.json(
                {
                    message:
                        "Account number is required",
                },
                {
                    status: 400,
                }
            );
        }

        if (!providerRef) {
            return NextResponse.json(
                {
                    message:
                        "Bank provider reference is required",
                },
                {
                    status: 400,
                }
            );
        }

        // -----------------------------------------
        // 4. Check whether this provider reference
        //    already exists
        // -----------------------------------------
        const existingAccount =
            await prisma.bankAccount.findUnique({
                where: {
                    providerRef,
                },
            });

        if (existingAccount) {
            if (
                existingAccount.userId !== userId
            ) {
                return NextResponse.json(
                    {
                        message:
                            "This bank account is already linked to another user",
                    },
                    {
                        status: 409,
                    }
                );
            }

            return NextResponse.json(
                {
                    message:
                        "This bank account is already linked",
                    account: existingAccount,
                },
                {
                    status: 200,
                }
            );
        }

        // -----------------------------------------
        // 5. Check whether user already has a
        //    primary account
        // -----------------------------------------
        const primaryAccount =
            await prisma.bankAccount.findFirst({
                where: {
                    userId,
                    isPrimary: true,
                },
                select: {
                    id: true,
                },
            });

        // -----------------------------------------
        // 6. Create bank account
        // -----------------------------------------
        const account =
            await prisma.bankAccount.create({
                data: {
                    userId,
                    bankName,
                    maskedAccount,
                    ifsc: ifsc || null,
                    provider:
                        provider || "DEMO_BANK",
                    providerRef,
                    status: "ACTIVE",
                    isPrimary:
                        !primaryAccount,
                    updatedAt: new Date(),
                },
            });

        // -----------------------------------------
        // 7. Return created account
        // -----------------------------------------
        return NextResponse.json(
            {
                message:
                    "Bank account linked successfully",
                account,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(
            "DEMO_BANK_LINK_POST_ERROR:",
            error
        );

        return NextResponse.json(
            {
                message:
                    "Unable to link bank account",
            },
            {
                status: 500,
            }
        );
    }
}
