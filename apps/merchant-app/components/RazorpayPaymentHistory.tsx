"use client";

import { useEffect, useState } from "react";

type Payment = {
  id: number;
  orderId: string;
  paymentId: string;
  amount: number | null;
  currency: string;
  status: string;
  createdAt: string;
};

export default function RazorpayPaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/razorpay/payments", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to fetch payments"
        );
      }

      setPayments(data.payments);
    } catch (error) {
      console.error("Payment History Error:", error);
      setError("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatAmount = (
    amount: number | null,
    currency: string
  ) => {
    if (amount === null) {
      return "N/A";
    }

    if (currency === "INR") {
      return `₹${amount.toLocaleString("en-IN")}`;
    }

    return `${currency} ${amount.toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-gray-600">
          Loading payment history...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-red-600">{error}</p>

        <button
          onClick={fetchPayments}
          className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Razorpay Payment History
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            View all Razorpay payments
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {payments.length === 0 ? (
        <p className="py-6 text-center text-gray-500">
          No payments found
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                  #
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                  Payment ID
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                  Order ID
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                  Amount
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                  Currency
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                  Status
                </th>

                <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">
                  Date
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-4 py-4 text-gray-700">
                    {payment.id}
                  </td>

                  <td className="px-4 py-4 font-medium text-gray-800">
                    {payment.paymentId}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {payment.orderId}
                  </td>

                  <td className="px-4 py-4 font-semibold text-gray-800">
                    {formatAmount(
                      payment.amount,
                      payment.currency
                    )}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {payment.currency}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        payment.status === "SUCCESS"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                    {formatDate(payment.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}