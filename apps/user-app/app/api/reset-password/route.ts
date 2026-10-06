import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";

import db from "@repo/db/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const token =
      typeof body?.token === "string"
        ? body.token.trim()
        : "";

    const newPassword =
      typeof body?.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmPassword =
      typeof body?.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    // =========================
    // Validate token
    // =========================

    if (!token) {
      return NextResponse.json(
        {
          message: "Invalid or missing reset token",
        },
        { status: 400 }
      );
    }

    // =========================
    // Validate password
    // =========================

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          message:
            "Password must contain at least 8 characters",
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          message: "Passwords do not match",
        },
        { status: 400 }
      );
    }

    // =========================
    // Hash incoming token
    // =========================

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // =========================
    // Find valid token
    // =========================

    const resetToken =
      await db.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },
      });

    if (!resetToken) {
      return NextResponse.json(
        {
          message: "Invalid or expired reset link",
        },
        { status: 400 }
      );
    }

    // =========================
    // Check if token was already used
    // =========================

    if (resetToken.usedAt) {
      return NextResponse.json(
        {
          message: "This reset link has already been used",
        },
        { status: 400 }
      );
    }

    // =========================
    // Check token expiry
    // =========================

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        {
          message: "This reset link has expired",
        },
        { status: 400 }
      );
    }

    // =========================
    // Hash new password
    // =========================

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    // =========================
    // Update password + mark
    // token as used
    // =========================

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          password: hashedPassword,
        },
      });

      await tx.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      });
    });

    return NextResponse.json(
      {
        message:
          "Password reset successfully. You can now login with your new password.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Reset password API error:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}