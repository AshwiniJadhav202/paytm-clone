
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetBalancePinPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");

    if (!/^\d{6}$/.test(pin)) {
      setMessage("PIN must contain exactly 6 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setMessage("PINs do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/balance/set-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin,
          confirmPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to set PIN.");
        return;
      }

      setMessage("Balance PIN set successfully!");

      setPin("");
      setConfirmPin("");

      setTimeout(() => {
        router.push("/balance");
      }, 1000);
    } catch (error) {
      console.error("SET_PIN_FRONTEND_ERROR:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Set Balance PIN
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create a 6-digit PIN to protect your balance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="pin"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Enter 6-digit PIN
            </label>

            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter PIN"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPin"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm 6-digit PIN
            </label>

            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Confirm PIN"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {message && (
            <p className="rounded-lg bg-slate-100 p-3 text-center text-sm text-slate-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving PIN..." : "Set PIN"}
          </button>
        </form>
      </div>
    </div>
  );
}