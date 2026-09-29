"use client";

import { useState } from "react";

type ConfirmPaymentButtonProps = {
  token: string;
};

export default function ConfirmPaymentButton({
  token,
}: ConfirmPaymentButtonProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    setMessage("");
    setSuccess(false);

    if (!/^\d{4,6}$/.test(pin)) {
      setMessage("Please enter a valid 4–6 digit Payment PIN");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/payment/confirm/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pin,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Payment failed");
        return;
      }

      setSuccess(true);
      setMessage(data.message || "Payment successful");
      setPin("");
    } catch (error) {
      console.error("Payment error:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Payment PIN */}
      <div className="mb-4">
        <label
          htmlFor="paymentPin"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Enter Payment PIN
        </label>

        <input
          id="paymentPin"
          type="password"
          inputMode="numeric"
          placeholder="Enter 4–6 digit PIN"
          value={pin}
          onChange={(e) => {
            const value = e.target.value;

            if (/^\d{0,6}$/.test(value)) {
              setPin(value);
            }
          }}
          maxLength={6}
          autoComplete="off"
          disabled={loading || success}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#6a51a6] disabled:bg-gray-100"
        />
      </div>

      {/* Confirm Payment Button */}
      <button
        onClick={handlePayment}
        disabled={loading || success}
        className="w-full rounded-lg bg-[#6a51a6] px-4 py-3 font-semibold text-white hover:bg-[#58418c] disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {loading
          ? "Processing Payment..."
          : success
            ? "Payment Successful"
            : "Confirm Payment"}
      </button>

      {/* Result Message */}
      {message && (
        <p
          className={`mt-4 text-center font-medium ${
            success ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}