
const SETU_TOKEN_URL = "https://uat.setu.co/api/v2/auth/token";

type SetuTokenResponse = {
  status: number;
  success: boolean;
  data?: {
    token: string;
    expiresIn: number;
  };
  error?: unknown;
};

export async function getSetuAccessToken(): Promise<string> {
  const clientID = process.env.SETU_CLIENT_ID;
  const secret = process.env.SETU_CLIENT_SECRET;

  if (!clientID || !secret) {
    throw new Error("Setu credentials are missing");
  }

  const response = await fetch(SETU_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientID,
      secret,
    }),
    cache: "no-store",
  });

  const result =
    (await response.json()) as SetuTokenResponse;

  if (!response.ok || !result.success || !result.data?.token) {
    console.error("Setu token generation failed:", {
      status: response.status,
      result,
    });

    throw new Error("Unable to generate Setu access token");
  }

  return result.data.token;
}