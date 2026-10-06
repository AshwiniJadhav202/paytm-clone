import RazorpayCheckout from "../../../components/RazorpayCheckout";

type PaymentRequestPageProps = {
  params: {
    token: string;
  };
};

type PaymentRequestResponse = {
  message?: string;
  paymentRequest?: {
    id: number;
    merchantId: number;
    merchantName: string | null;
    merchantEmail: string;
    amount: number;
    amountInRupees: number;
    description: string | null;
    token: string;
    status: string;
    currency: string;
    createdAt: string;
  };
};

async function getPaymentRequest(
  token: string
): Promise<PaymentRequestResponse> {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const response = await fetch(
    `${baseUrl}/api/payment-request/${token}`,
    {
      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as PaymentRequestResponse;

  if (!response.ok) {
    return {
      message:
        data.message ||
        "Payment request not found",
    };
  }

  return data;
}

export default async function PaymentRequestPage({
  params,
}: PaymentRequestPageProps) {
  const data =
    await getPaymentRequest(params.token);

  if (!data.paymentRequest) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-5xl">
            ⚠️
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-800">
            Payment Request Not Found
          </h1>

          <p className="text-gray-600">
            {data.message ||
              "This payment request is invalid or no longer available."}
          </p>
        </div>
      </main>
    );
  }

  const paymentRequest =
    data.paymentRequest;

  const merchantName =
    paymentRequest.merchantName ||
    paymentRequest.merchantEmail;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl">
            ₹
          </div>

          <h1 className="text-2xl font-bold text-gray-800">
            Payment Request
          </h1>

          <p className="mt-2 text-gray-500">
            You are paying
          </p>

          <p className="mt-1 text-lg font-semibold text-gray-800">
            {merchantName}
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">
            Amount
          </p>

          <p className="mt-2 text-4xl font-bold text-gray-900">
            ₹
            {paymentRequest.amount.toLocaleString(
              "en-IN"
            )}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            {paymentRequest.currency}
          </p>
        </div>

        <div className="mb-6 space-y-3 rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-500">
              Merchant
            </span>

            <span className="font-medium text-gray-800">
              {merchantName}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-500">
              Email
            </span>

            <span className="break-all text-right font-medium text-gray-800">
              {paymentRequest.merchantEmail}
            </span>
          </div>

          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-500">
              Status
            </span>

            <span className="font-medium text-green-600">
              {paymentRequest.status}
            </span>
          </div>
        </div>

        <RazorpayCheckout
          amount={paymentRequest.amount}
          orderId={paymentRequest.token}
          merchantName={merchantName}
          description={
            paymentRequest.description ||
            "Payment Request"
          }
        />

        <p className="mt-5 text-center text-xs text-gray-400">
          Secure payment powered by Razorpay
        </p>
      </div>
    </main>
  );
}
