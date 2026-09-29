"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { qrPayment } from "../app/lib/actions/qrPayment";

type QRPaymentFormProps = {
    receiverId: number;
    receiverName: string;
    receiverNumber: string;
};

export default function QRPaymentForm({
    receiverId,
    receiverName,
    receiverNumber,
}: QRPaymentFormProps) {
    const router = useRouter();

    const [amount, setAmount] = useState("");
    const [balancePin, setBalancePin] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    async function handlePayment(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setMessage("");
        setSuccess(false);

        const amountInRupees = Number(amount);

        if (
            !amount ||
            !Number.isFinite(amountInRupees) ||
            amountInRupees <= 0
        ) {
            setMessage("Please enter a valid amount");
            return;
        }

        if (!/^\d{4,6}$/.test(balancePin)) {
            setMessage("PIN must contain 4 to 6 digits");
            return;
        }

        // Convert rupees to paise
        const amountInPaise = Math.round(amountInRupees * 100);

        setLoading(true);

        try {
            const result = await qrPayment(
                receiverId,
                amountInPaise,
                balancePin
            );

            setMessage(result.message);

            if (result.success) {
                setSuccess(true);
                setAmount("");
                setBalancePin("");
            }
        } catch (error) {
            console.error("QR Payment Error:", error);
            setMessage("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl">
                    💳
                </div>

                <h1 className="text-2xl font-bold text-gray-800">
                    Pay User
                </h1>

                <p className="mt-2 text-gray-500">
                    Send money securely
                </p>
            </div>

            <div className="mb-6 rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                    Paying to
                </p>

                <p className="mt-1 text-lg font-bold text-gray-800">
                    {receiverName}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                    {receiverNumber}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                    User ID: {receiverId}
                </p>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
                <div>
                    <label
                        htmlFor="amount"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Amount (₹)
                    </label>

                    <input
                        id="amount"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(event) =>
                            setAmount(event.target.value)
                        }
                        disabled={loading || success}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        required
                    />
                </div>

                <div>
                    <label
                        htmlFor="balancePin"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Balance PIN
                    </label>

                    <input
                        id="balancePin"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 4–6 digit PIN"
                        value={balancePin}
                        onChange={(event) =>
                            setBalancePin(
                                event.target.value.replace(/\D/g, "")
                            )
                        }
                        disabled={loading || success}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        required
                    />
                </div>

                {message && (
                    <div
                        className={`rounded-lg p-3 text-sm ${
                            success
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}
                    >
                        {message}
                    </div>
                )}

                {success ? (
                    <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
                    >
                        Go to Dashboard
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {loading ? "Processing..." : "Pay Now"}
                    </button>
                )}
            </form>

            <p className="mt-5 text-center text-xs text-gray-400">
                Demo wallet payment • Not a real UPI transaction
            </p>
        </div>
    );
}