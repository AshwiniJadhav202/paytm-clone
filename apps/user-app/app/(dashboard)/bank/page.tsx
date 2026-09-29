
"use client";

import { useEffect, useState } from "react";

type BankAccount = {
    id: number;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    balance: number;
    isVerified: boolean;
    createdAt: string;
};

export default function BankPage() {
    const [bankName, setBankName] = useState("Demo Bank");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountHolder, setAccountHolder] = useState("");

    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    async function fetchAccounts() {
        try {
            const response = await fetch("/api/demo-bank/link");

            const data = await response.json();

            if (response.ok) {
                setAccounts(data.accounts || []);
            }
        } catch (error) {
            console.error("Fetch accounts error:", error);
        } finally {
            setFetching(false);
        }
    }

    useEffect(() => {
        fetchAccounts();
    }, []);

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault();

        setMessage("");
        setLoading(true);

        try {
            const response = await fetch("/api/demo-bank/link", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    bankName,
                    accountNumber,
                    accountHolder,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Something went wrong");
                return;
            }

            setMessage(data.message);

            setAccountNumber("");
            setAccountHolder("");

            await fetchAccounts();
        } catch (error) {
            setMessage("Unable to connect to server");
        } finally {
            setLoading(false);
        }
    }

    function formatBalance(balance: number) {
        return `₹${(balance / 100).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    function maskAccountNumber(accountNumber: string) {
        if (accountNumber.length <= 4) {
            return accountNumber;
        }

        return `XXXXXX${accountNumber.slice(-4)}`;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="mx-auto max-w-2xl space-y-6">

                {/* Linked Bank Accounts */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h1 className="mb-4 text-2xl font-bold">
                        Linked Bank Accounts
                    </h1>

                    {fetching ? (
                        <p className="text-gray-500">
                            Loading accounts...
                        </p>
                    ) : accounts.length === 0 ? (
                        <p className="text-gray-500">
                            No bank account linked yet.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className="rounded-lg border p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold">
                                            {account.bankName}
                                        </h2>

                                        <span className="rounded bg-green-100 px-2 py-1 text-sm text-green-700">
                                            {account.isVerified
                                                ? "Verified"
                                                : "Not Verified"}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-gray-600">
                                        {account.accountHolder}
                                    </p>

                                    <p className="text-gray-500">
                                        Account:{" "}
                                        {maskAccountNumber(
                                            account.accountNumber
                                        )}
                                    </p>

                                    <p className="mt-3 text-xl font-bold text-blue-600">
                                        Demo Balance:{" "}
                                        {formatBalance(account.balance)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Link New Bank Account */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h1 className="mb-2 text-2xl font-bold">
                        Link Demo Bank Account
                    </h1>

                    <p className="mb-6 text-sm text-gray-500">
                        This is a demo bank account for testing only.
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Bank Name
                            </label>

                            <select
                                value={bankName}
                                onChange={(e) =>
                                    setBankName(e.target.value)
                                }
                                className="w-full rounded border p-2"
                            >
                                <option value="Demo Bank">
                                    Demo Bank
                                </option>

                                <option value="Test Bank">
                                    Test Bank
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Account Holder Name
                            </label>

                            <input
                                type="text"
                                value={accountHolder}
                                onChange={(e) =>
                                    setAccountHolder(e.target.value)
                                }
                                placeholder="Enter demo name"
                                required
                                className="w-full rounded border p-2"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Account Number
                            </label>

                            <input
                                type="text"
                                inputMode="numeric"
                                value={accountNumber}
                                onChange={(e) =>
                                    setAccountNumber(e.target.value)
                                }
                                placeholder="1234567890"
                                required
                                className="w-full rounded border p-2"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded bg-blue-600 p-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading
                                ? "Linking..."
                                : "Link Bank Account"}
                        </button>
                    </form>

                    {message && (
                        <p className="mt-4 rounded bg-gray-100 p-3 text-sm">
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}