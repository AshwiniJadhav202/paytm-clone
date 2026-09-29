"use client";

import { useState } from "react";

type PaymentRequest = {
  id: number;
  amount: number;
  amountInRupees: number;
  description: string | null;
  token: string;
  status: string;
  createdAt: string;
};

export default function PaymentRequestPage() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentRequest, setPaymentRequest] =
    useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createPaymentRequest(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setPaymentRequest(null);

    if (!amount || Number(amount) <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/payment-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(amount),
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to create payment request");
        return;
      }

      setPaymentRequest(data.paymentRequest);
      setMessage(data.message);

      setAmount("");
      setDescription("");
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">
          Create Payment Request
        </h1>

        <p className="mb-6 text-sm text-slate-500">
          Generate a demo payment request for your customer.
        </p>

        <form onSubmit={createPaymentRequest} className="space-y-4">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Amount (₹)
            </label>

            <input
              type="number"
              min="1"
              max="100000"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Description
            </label>

            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: Demo Product Payment"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "Creating..." : "Create Payment Request"}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
            {message}
          </p>
        )}

        {paymentRequest && (
          <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-5">
            <h2 className="mb-3 text-lg font-bold text-green-800">
              Payment Request Created
            </h2>

            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <strong>Request ID:</strong> {paymentRequest.id}
              </p>

              <p>
                <strong>Amount:</strong> ₹
                {paymentRequest.amountInRupees.toFixed(2)}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {paymentRequest.description || "No description"}
              </p>

              <p>
                <strong>Status:</strong> {paymentRequest.status}
              </p>

              <div>
                <strong>Payment Token:</strong>

                <p className="mt-1 break-all rounded bg-white p-2 font-mono text-xs">
                  {paymentRequest.token}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}