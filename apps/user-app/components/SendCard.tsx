"use client";

import { useState } from "react";
import { p2pTransfer } from "../app/lib/actions/p2pTransfer";

export function SendCard() {
  const [receiverNumber, setReceiverNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setMessage("");

    const number = receiverNumber.trim();
    const parsedAmount = Number(amount);

    if (!number) {
      setMessage("Please enter receiver mobile number");
      return;
    }

    if (
      !Number.isInteger(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setMessage("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);

      const result = await p2pTransfer(
        number,
        parsedAmount
      );

      setMessage(result.message);

      if (
        result.message ===
        "Money sent successfully!"
      ) {
        setReceiverNumber("");
        setAmount("");
      }
    } catch (error) {
      console.error(
        "Send money error:",
        error
      );

      setMessage(
        "Something went wrong while sending money"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Send Money
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Send money instantly to another user.
          </p>
        </div>

        {/* Receiver Number */}
        <div className="mb-5">
          <label
            htmlFor="receiverNumber"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Receiver Mobile Number
          </label>

          <input
            id="receiverNumber"
            type="tel"
            value={receiverNumber}
            onChange={(e) =>
              setReceiverNumber(e.target.value)
            }
            placeholder="Enter mobile number"
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>

        {/* Amount */}
        <div className="mb-6">
          <label
            htmlFor="amount"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Amount
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              ₹
            </span>

            <input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              placeholder="Enter amount"
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 py-3 pl-9 pr-4 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              message ===
              "Money sent successfully!"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Sending..."
            : "Send Money"}
        </button>

      </div>
    </div>
  );
}