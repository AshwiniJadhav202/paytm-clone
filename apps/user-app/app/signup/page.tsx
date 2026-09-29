"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [password, setPassword] = useState("");
  const [balancePin, setBalancePin] = useState("");
  const [confirmBalancePin, setConfirmBalancePin] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Validate payment PIN
    if (!/^\d{4,6}$/.test(balancePin)) {
      setError(
        "Payment PIN must contain 4 to 6 digits"
      );
      return;
    }

    // Validate confirmation PIN
    if (balancePin !== confirmBalancePin) {
      setError(
        "Payment PIN and Confirm Payment PIN must match"
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          number: number.trim(),
          password,
          balancePin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess(
        "Account created successfully! Redirecting to login..."
      );

      setTimeout(() => {
        router.push("/signin");
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">

        {/* Header */}
        <h1 className="mb-2 text-center text-3xl font-bold text-blue-600">
          Paytm Clone
        </h1>

        <p className="mb-6 text-center text-gray-500">
          Create your account
        </p>

        {/* Signup Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>

            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label
              htmlFor="number"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Mobile Number
            </label>

            <input
              id="number"
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              pattern="[0-9]{10}"
              maxLength={10}
              minLength={10}
              autoComplete="tel"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Payment PIN */}
          <div>
            <label
              htmlFor="balancePin"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Payment PIN
            </label>

            <input
              id="balancePin"
              type="password"
              inputMode="numeric"
              placeholder="Enter 4–6 digit payment PIN"
              value={balancePin}
              onChange={(e) => {
                const value = e.target.value;

                if (/^\d{0,6}$/.test(value)) {
                  setBalancePin(value);
                }
              }}
              required
              minLength={4}
              maxLength={6}
              pattern="[0-9]{4,6}"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <p className="mt-1 text-xs text-gray-500">
              Use a 4–6 digit PIN for demo payments.
            </p>
          </div>

          {/* Confirm Payment PIN */}
          <div>
            <label
              htmlFor="confirmBalancePin"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Confirm Payment PIN
            </label>

            <input
              id="confirmBalancePin"
              type="password"
              inputMode="numeric"
              placeholder="Re-enter payment PIN"
              value={confirmBalancePin}
              onChange={(e) => {
                const value = e.target.value;

                if (/^\d{0,6}$/.test(value)) {
                  setConfirmBalancePin(value);
                }
              }}
              required
              minLength={4}
              maxLength={6}
              pattern="[0-9]{4,6}"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Success Message */}
          {success && (
            <p className="text-sm text-green-600">
              {success}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        {/* Sign In Link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}

          <a
            href="/signin"
            className="font-semibold text-blue-600 hover:underline"
          >
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}