import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@repo/db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    // =========================
    // Validate email
    // =========================
    if (!email) {
      return NextResponse.json(
        {
          message: "Please enter your email address",
        },
        { status: 400 }
      );
    }

    // =========================
    // Find user
    // =========================
    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    /*
     * Important:
     * We return the same response whether the user exists or not.
     * This prevents attackers from checking which emails are registered.
     */
    const genericMessage =
      "If an account exists with this email, a password reset link has been generated.";

    if (!user) {
      return NextResponse.json({
        message: genericMessage,
      });
    }

    // =========================
    // Remove old unused tokens
    // =========================
    await db.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        OR: [
          {
            usedAt: {
              not: null,
            },
          },
          {
            expiresAt: {
              lt: new Date(),
            },
          },
        ],
      },
    });

    // =========================
    // Generate secure token
    // =========================
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Store only the hash in database
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Token valid for 15 minutes
    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    // =========================
    // Save token
    // =========================
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // =========================
    // Create reset URL
    // =========================
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const resetUrl =
      `${baseUrl}/reset-password?token=${rawToken}`;

    /*
     * DEVELOPMENT ONLY
     *
     * We are not connecting an email provider yet.
     * So for now, the reset URL is printed in the terminal.
     *
     * Later we will replace this with actual email sending.
     */
    console.log("========================================");
    console.log("PASSWORD RESET REQUEST");
    console.log("User:", user.email);
    console.log("Reset URL:", resetUrl);
    console.log("Expires At:", expiresAt.toISOString());
    console.log("========================================");

    return NextResponse.json({
      message: genericMessage,

      // Development testing only.
      // Remove this before production.
      resetUrl,
    });
  } catch (error) {
    console.error("Forgot password API error:", error);

    return NextResponse.json(
      {
        message: "Something went wrong. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
