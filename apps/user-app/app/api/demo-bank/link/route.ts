import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import prisma from "@repo/db/client";


export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const accounts = await prisma.demoBankAccount.findMany({
            where: {
                userId: Number(session.user.id),
            },
            select: {
                id: true,
                bankName: true,
                accountHolder: true,
                accountNumber: true,
                balance: true,
                isVerified: true,
                createdAt: true,
            },
        });

        return NextResponse.json({
            accounts,
        });
    } catch (error) {
        console.error("Demo Bank Fetch Error:", error);

        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();

        const {
            bankName,
            accountNumber,
            accountHolder,
        } = body;

        if (!bankName || !accountNumber || !accountHolder) {
            return NextResponse.json(
                { message: "All fields are required" },
                { status: 400 }
            );
        }

        if (!/^\d{10,16}$/.test(accountNumber)) {
            return NextResponse.json(
                { message: "Enter a valid demo account number" },
                { status: 400 }
            );
        }

        const userId = Number(session.user.id);

        const existingAccount = await prisma.demoBankAccount.findUnique({
            where: {
                userId_bankName: {
                    userId,
                    bankName,
                },
            },
        });

        if (existingAccount) {
            return NextResponse.json(
                { message: "This bank is already linked" },
                { status: 409 }
            );
        }

        const account = await prisma.demoBankAccount.create({
            data: {
                userId,
                bankName,
                accountNumber,
                accountHolder,
                balance: 100000,
                isVerified: true,
            },
        });

        return NextResponse.json(
            {
                message: "Demo bank account linked successfully",
                account: {
                    id: account.id,
                    bankName: account.bankName,
                    accountHolder: account.accountHolder,
                    balance: account.balance,
                    isVerified: account.isVerified,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Demo Bank Linking Error:", error);

        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );
    }
}