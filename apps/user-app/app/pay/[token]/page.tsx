import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import ConfirmPaymentButton from "./ConfirmPaymentButton";

type PaymentRequest = {
  id: number;
  merchantId: number;
  merchantName: string;
  merchantEmail: string;
  amount: number;
  amountInRupees: number;
  description: string | null;
  token: string;
  status: string;
  createdAt: string;
};

type PaymentPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PaymentPage({
  params,
}: PaymentPageProps) {
  const { token } = await params;

  // Check whether the user is logged in
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = `/pay/${token}`;

    redirect(
      `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
  }

  // Fetch payment request details from merchant app
  const response = await fetch(
    `http://localhost:3000/api/payment-request/${token}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    notFound();
  }

  const data = await response.json();

  const paymentRequest: PaymentRequest =
    data.paymentRequest;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#6a51a6]">
            Paytm Clone
          </h1>

          <p className="mt-2 text-gray-500">
            Payment Request
          </p>
        </div>

        {/* Merchant Details */}
        <div className="mb-5 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-500">
            Paying to
          </p>

          <h2 className="mt-1 text-xl font-semibold text-gray-800">
            {paymentRequest.merchantName}
          </h2>

          <p className="text-sm text-gray-500">
            {paymentRequest.merchantEmail}
          </p>
        </div>

        {/* Amount */}
        <div className="mb-5 text-center">
          <p className="text-sm text-gray-500">
            Amount to Pay
          </p>

          <h2 className="mt-1 text-4xl font-bold text-green-600">
            ₹{paymentRequest.amountInRupees}
          </h2>
        </div>

        {/* Description */}
        <div className="mb-5 rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            Description
          </p>

          <p className="mt-1 font-medium text-gray-800">
            {paymentRequest.description ||
              "No description provided"}
          </p>
        </div>

        {/* Payment Status */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-yellow-50 p-4">
          <span className="text-sm font-medium text-gray-600">
            Payment Status
          </span>

          <span className="font-semibold text-yellow-600">
            {paymentRequest.status}
          </span>
        </div>

        {/* Confirm Payment */}
        <ConfirmPaymentButton token={token} />

        <p className="mt-4 text-center text-xs text-gray-400">
          This is a demo payment system.
        </p>
      </div>
    </div>
  );
}