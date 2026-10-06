"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BalancePage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPinSetup() {
      try {
        const response = await fetch("/api/balance/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (data.needsPinSetup) {
          router.replace("/balance/set-pin");
          return;
        }
      } catch {
        setMessage("Unable to check PIN status");
      } finally {
        setLoading(false);
      }
    }

    checkPinSetup();
  }, [router]);

  async function checkBalance() {
    if (!/^\d{6}$/.test(pin)) {
      setMessage("Please enter a valid 6-digit PIN");
      return;
    }

    setLoading(true);
    setMessage("");
    setBalance(null);

    try {
      const response = await fetch("/api/balance/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (
        data.needsPinSetup ||
        data.message === "Please set your balance PIN first"
      ) {
        router.replace("/balance/set-pin");
        return;
      }

      if (!response.ok) {
        setMessage(data.message || "Unable to check balance");
        return;
      }

      setBalance(data.balance);
    } catch {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <p>Checking PIN status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Bank Balance
      </h1>

      <div className="max-w-md rounded-lg border p-6 shadow">
        <label className="mb-2 block font-medium">
          Enter 6-Digit Balance PIN
        </label>

        <input
          type="password"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          className="mb-4 w-full rounded border p-3"
        />

        <button
          onClick={checkBalance}
          disabled={loading}
          className="w-full rounded bg-blue-600 p-3 text-white disabled:bg-gray-400"
        >
          {loading ? "Checking..." : "Check Balance"}
        </button>

        {message && (
          <p className="mt-4 text-red-600">
            {message}
          </p>
        )}

        {balance !== null && (
          <div className="mt-6 rounded bg-green-100 p-4">
            <p className="text-gray-700">
              Available Balance
            </p>

            <h2 className="text-2xl font-bold text-green-700">
              ₹{balance.toFixed(2)}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}