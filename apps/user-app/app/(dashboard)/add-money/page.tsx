"use client";

import { useEffect, useState } from "react";

type BankAccount = {
    id: number;
    bankName: string;
    maskedAccount: string;
    ifsc: string | null;
    provider: string;
    providerRef: string;
    status: string;
    isPrimary: boolean;
    createdAt: string;
    updatedAt: string;
};

export default function AddMoneyPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch("/api/demo-bank/link");
        const data = await response.json();

        if (response.ok) {
          setAccounts(data.accounts || []);
        } else {
          setMessage(data.message || "Unable to load bank accounts");
        }
      } catch {
        setMessage("Unable to load bank accounts");
      }
    }

    fetchAccounts();
  }, []);

  async function handleAddMoney() {
    setMessage("");

    if (!bankAccountId) {
      setMessage("Please select a bank account");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      setMessage("Please enter a valid 6-digit PIN");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/demo-bank/add-money", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankAccountId: Number(bankAccountId),
          amount: Number(amount),
          pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to add money");
        return;
      }

      setMessage(data.message);
      setAmount("");
      setPin("");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Add Money
      </h1>

      <div className="max-w-md rounded-lg border p-6 shadow">
        <label className="mb-2 block font-medium">
          Select Bank Account
        </label>

        <select
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          className="mb-4 w-full rounded border p-3"
        >
          <option value="">Select account</option>

          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.bankName} - XXXX
              {account.maskedAccount.slice(-4)}
            </option>
          ))}
        </select>

        <label className="mb-2 block font-medium">
          Amount (₹)
        </label>

        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="mb-4 w-full rounded border p-3"
        />

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
          onClick={handleAddMoney}
          disabled={loading}
          className="w-full rounded bg-blue-600 p-3 text-white disabled:bg-gray-400"
        >
          {loading ? "Processing..." : "Add Money"}
        </button>

        {message && (
          <p className="mt-4 text-center text-blue-600">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}