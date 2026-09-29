
import { NextResponse } from "next/server";
import { getSetuAccessToken } from "../../../../lib/setu/auth";

export async function GET() {
  try {
    const token = await getSetuAccessToken();

    return NextResponse.json({
      success: true,
      message: "Setu access token generated successfully",
      tokenGenerated: Boolean(token),
    });
  } catch (error) {
    console.error("Setu token route error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Setu authentication failed",
      },
      { status: 500 }
    );
  }
}