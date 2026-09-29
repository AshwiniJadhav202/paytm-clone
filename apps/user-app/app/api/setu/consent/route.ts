
import { NextResponse } from "next/server";
import { getSetuAccessToken } from "../../../../lib/setu/auth";

const SETU_BASE_URL = "https://fiu-sandbox.setu.co";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const mobile = body.mobile;

    // Validate mobile number
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid 10-digit mobile number is required",
        },
        { status: 400 }
      );
    }

    // Get Product Instance ID
    const productInstanceId =
      process.env.SETU_PRODUCT_INSTANCE_ID;

    if (!productInstanceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Setu product instance ID is missing",
        },
        { status: 500 }
      );
    }

    // Generate Setu access token
    const accessToken = await getSetuAccessToken();

    // Data range: Previous 1 year to current date
    const today = new Date();

    const fromDate = new Date();
    fromDate.setFullYear(today.getFullYear() - 1);

    // Create Consent Request
    const consentRequest = {
      consentDuration: {
        unit: "MONTH",
        value: 4,
      },

      vua: mobile,

      consentMode: "STORE",

      fetchType: "ONETIME",

      consentTypes: [
        "PROFILE",
        "SUMMARY",
        "TRANSACTIONS",
      ],

      fiTypes: [
        "DEPOSIT",
      ],

      purpose: {
        code: "102",
        refUri:
          "https://api.rebit.org.in/aa/purpose/102.xml",
        text:
          "Customer spending patterns, budget or other reportings",
        category: {
          type: "Financial information",
        },
      },

      dataRange: {
        from: fromDate.toISOString(),
        to: today.toISOString(),
      },

      dataLife: {
        unit: "MONTH",
        value: 1,
      },

      frequency: {
        unit: "HOURLY",
        value: 1,
      },

      redirectUrl:
        "http://localhost:3001/dashboard",

      context: [],

      additionalParams: {
        tags: ["Paytm_Clone"],
      },
    };

    // Call Setu Create Consent API
    const response = await fetch(
      `${SETU_BASE_URL}/v2/consents`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-product-instance-id": productInstanceId,
        },

        body: JSON.stringify(consentRequest),

        cache: "no-store",
      }
    );

    const result = await response.json();

    // Handle Setu API error
    if (!response.ok) {
      console.error(
        "Setu consent creation failed:",
        {
          status: response.status,
          result,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to create Setu consent",
          error: result,
        },
        { status: response.status }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: "Setu consent created successfully",

      consent: {
        id: result.id,
        url: result.url,
        status: result.status,
      },
    });
  } catch (error) {
    console.error(
      "Setu consent route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}