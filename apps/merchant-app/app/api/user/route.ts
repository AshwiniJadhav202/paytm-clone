import { NextResponse } from "next/server";
import prisma from "@repo/db/client";

export const GET = async () => {
    const user = await prisma.user.create({
        data: {
            email: "asd",
            name: "adsads",
            number: "9999999999",
            password: "test123"
        }
    });

    return NextResponse.json({
        message: "User created successfully",
        user
    });
};