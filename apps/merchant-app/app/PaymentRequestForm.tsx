
"use client";

import { useState } from "react";

type PaymentRequest = {
  id: number;
  amountInRupees: number;
  description: string | null;
  token: string;
  status: string;
  createdAt: string;
};

export default function PaymentRequestForm() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentRequest, setPaymentRequest] =
    useState<PaymentRequest | null>(null);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");
    setPaymentRequest(null);

    try {
      const response = await fetch("/api/payment-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create payment request"
        );
      }

      setSuccess(data.message);
      setPaymentRequest(data.paymentRequest);

      setAmount("");
      setDescription("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-10 rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-xl font-semibold">
        Create Payment Request
      </h2>

      <p className="mb-5 text-sm text-slate-600">
        Generate a payment request for your customer.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
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
            required
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Description
          </label>

          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Example: Product payment"
            maxLength={255}
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#6a51a6] px-5 py-2 font-semibold text-white hover:bg-[#58418d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Payment Request"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && paymentRequest && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="mb-3 font-semibold text-green-800">
            {success}
          </h3>

          <div className="space-y-2 text-sm">
            <p>
              <strong>Request ID:</strong> {paymentRequest.id}
            </p>

            <p>
              <strong>Amount:</strong> ₹
              {paymentRequest.amountInRupees.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>

            <p>
              <strong>Description:</strong>{" "}
              {paymentRequest.description || "—"}
            </p>

            <p>
              <strong>Status:</strong> {paymentRequest.status}
            </p>

            <p className="break-all">
              <strong>Token:</strong> {paymentRequest.token}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}