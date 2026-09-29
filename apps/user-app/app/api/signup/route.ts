import { NextResponse } from "next/server";
import db from "@repo/db/client";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const number = body.number?.trim();
    const password = body.password;
    const balancePin = body.balancePin?.trim();

    // 1. Validate required fields
    if (
      !name ||
      !email ||
      !number ||
      !password ||
      !balancePin
    ) {
      return NextResponse.json(
        {
          message:
            "Name, email, mobile number, password and payment PIN are required",
        },
        {
          status: 400,
        }
      );
    }

    // 2. Validate password
    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
      return NextResponse.json(
        {
          message:
            "Password must contain at least 6 characters",
        },
        {
          status: 400,
        }
      );
    }

    // 3. Validate payment PIN
    if (
      typeof balancePin !== "string" ||
      !/^\d{4,6}$/.test(balancePin)
    ) {
      return NextResponse.json(
        {
          message:
            "Payment PIN must contain 4 to 6 digits",
        },
        {
          status: 400,
        }
      );
    }

    // 4. Check whether the user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          {
            email,
          },
          {
            number,
          },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            "Email or mobile number already registered",
        },
        {
          status: 409,
        }
      );
    }

    // 5. Hash password and payment PIN
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const hashedBalancePin = await bcrypt.hash(
      balancePin,
      10
    );

    // 6. Create User + Balance together
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          number,
          password: hashedPassword,
          balancePin: hashedBalancePin,
        },
      });

      // Create wallet/balance for the new user
      await tx.balance.create({
        data: {
          userId: newUser.id,
          amount: 0,
          locked: 0,
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        userId: user.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Signup error:", error);

    return NextResponse.json(
      {
        message:
          "Something went wrong while creating the account",
      },
      {
        status: 500,
      }
    );
  }
}